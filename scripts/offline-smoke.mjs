#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HOST = '127.0.0.1'
const PREFERRED_APP_PORT = Number(process.env.LUMEN_SMOKE_PORT ?? 5180)
const PREFERRED_DEBUG_PORT = Number(process.env.LUMEN_CHROME_DEBUG_PORT ?? 9223)
const SMOKE_TEXT = 'Idea -> Sketch -> Build -> Ship'

function log(message) {
  process.stdout.write(`[offline-smoke] ${message}\n`)
}

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    ...options,
  })
  child.stdout.on('data', (data) => process.stdout.write(data))
  child.stderr.on('data', (data) => process.stderr.write(data))
  return child
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        child.kill('SIGKILL')
      }
      resolve()
    }, 2_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function waitForHttp(url, timeoutMs = 30_000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
      lastError = new Error(`${url} returned ${res.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`)
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, HOST)
  })
}

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error(`No available port found from ${preferredPort} to ${preferredPort + 99}`)
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean)
  return candidates[0]
}

class CdpSession {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    this.events = new Map()

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id)
        this.pending.delete(data.id)
        if (data.error) reject(new Error(data.error.message))
        else resolve(data.result)
        return
      }
      const handlers = this.events.get(data.method)
      if (handlers) handlers.forEach((handler) => handler(data.params))
    })
  }

  call(method, params = {}, timeoutMs = 10_000) {
    const id = this.nextId++
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!this.pending.has(id)) return
        this.pending.delete(id)
        reject(new Error(`CDP call timed out: ${method}`))
      }, timeoutMs)
    })
  }

  close() {
    this.ws.close()
  }
}

async function connectToPage(appUrl, debugPort) {
  const target = await fetchJson(
    `http://${HOST}:${debugPort}/json/new?${encodeURIComponent(appUrl)}`,
    { method: 'PUT' },
  )
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  const cdp = new CdpSession(ws)
  await cdp.call('Runtime.enable')
  await cdp.call('Page.enable')
  return cdp
}

async function evaluate(cdp, expression, timeoutMs = 10_000) {
  const result = await cdp.call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs,
  }, timeoutMs + 5_000)
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed')
  }
  return result.result.value
}

async function waitForEvaluation(cdp, expression, timeoutMs = 15_000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await evaluate(cdp, expression, 2_000)
      if (result) return result
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError ?? new Error('Timed out waiting for page evaluation')
}

async function main() {
  const chromeBin = findChrome()
  if (!chromeBin) throw new Error('Set CHROME_BIN to a Chromium/Chrome executable')

  const appPort = await findAvailablePort(PREFERRED_APP_PORT)
  const debugPort = await findAvailablePort(PREFERRED_DEBUG_PORT)
  const appUrl = `http://${HOST}:${appPort}`
  const profileDir = await mkdtemp(join(tmpdir(), 'lumen-smoke-'))
  const server = spawnLogged('npm', [
    'run',
    'dev',
    '--',
    '--host',
    HOST,
    '--port',
    String(appPort),
    '--strictPort',
  ])
  const chrome = spawnLogged(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ])

  try {
    log(`waiting for Vite at ${appUrl}`)
    await waitForHttp(appUrl)
    log(`waiting for Chromium CDP on ${debugPort}`)
    await waitForHttp(`http://${HOST}:${debugPort}/json/version`)

    const cdp = await connectToPage(appUrl, debugPort)
    try {
      await waitForEvaluation(cdp, `
        Boolean(document.querySelector('textarea') && window.__lumenSceneInfo)
      `)

      await evaluate(cdp, `
        (() => {
          localStorage.clear()
          const textarea = document.querySelector('textarea')
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
          setter.call(textarea, ${JSON.stringify(SMOKE_TEXT)})
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          document.querySelector('form').requestSubmit()
          return true
        })()
      `)

      const result = await waitForEvaluation(cdp, `
        (() => {
          const expectedLabels = ['Idea', 'Sketch', 'Build', 'Ship']
          const scene = window.__lumenSceneInfo()
          const raw = localStorage.getItem('lumen-scene-v1')
          const saved = raw ? JSON.parse(raw).elements.filter((e) => !e.isDeleted) : []
          const text = document.body.innerText
          const labels = saved
            .map((e) => e.text || e.label?.text || e.originalText || '')
            .filter(Boolean)
          const hasLabels = expectedLabels.every((label) =>
            labels.some((text) => text.includes(label)),
          )
          const arrows = saved.filter((e) => e.type === 'arrow').length
          const bubblesReady = text.includes('4-step flow') && text.includes(${JSON.stringify(SMOKE_TEXT)})
          if (scene.length >= 7 && saved.length >= 7 && arrows >= 3 && hasLabels && bubblesReady) {
            return { sceneCount: scene.length, savedCount: saved.length, arrows, labels }
          }
          return null
        })()
      `)

      log(`passed: ${result.savedCount} persisted elements, ${result.arrows} arrows`)
    } finally {
      cdp.close()
    }
  } finally {
    await stopChild(server)
    await stopChild(chrome)
    await rm(profileDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`[offline-smoke] failed: ${error.message}`)
  process.exit(1)
})
