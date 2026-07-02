#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HOST = '127.0.0.1'
const APP_PORT = Number(process.env.LUMEN_SMOKE_PORT ?? 5180)
const DEBUG_PORT = Number(process.env.LUMEN_CHROME_DEBUG_PORT ?? 9223)
const APP_URL = `http://${HOST}:${APP_PORT}`
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

  call(method, params = {}) {
    const id = this.nextId++
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!this.pending.has(id)) return
        this.pending.delete(id)
        reject(new Error(`CDP call timed out: ${method}`))
      }, 10_000)
    })
  }

  close() {
    this.ws.close()
  }
}

async function connectToPage() {
  const target = await fetchJson(
    `http://${HOST}:${DEBUG_PORT}/json/new?${encodeURIComponent(APP_URL)}`,
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
  })
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
      return await evaluate(cdp, expression, timeoutMs)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw lastError ?? new Error('Timed out waiting for page evaluation')
}

async function main() {
  const chromeBin = findChrome()
  if (!chromeBin) throw new Error('Set CHROME_BIN to a Chromium/Chrome executable')

  const profileDir = await mkdtemp(join(tmpdir(), 'lumen-smoke-'))
  const server = spawnLogged('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(APP_PORT)])
  const chrome = spawnLogged(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ])

  try {
    log(`waiting for Vite at ${APP_URL}`)
    await waitForHttp(APP_URL)
    log(`waiting for Chromium CDP on ${DEBUG_PORT}`)
    await waitForHttp(`http://${HOST}:${DEBUG_PORT}/json/version`)

    const cdp = await connectToPage()
    try {
      await waitForEvaluation(cdp, `
        new Promise((resolve, reject) => {
          const started = Date.now()
          const tick = () => {
            if (document.querySelector('textarea') && window.__lumenSceneInfo) resolve(true)
            else if (Date.now() - started > 15000) reject(new Error('Lumen UI did not become ready'))
            else setTimeout(tick, 100)
          }
          tick()
        })
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

      const result = await evaluate(cdp, `
        new Promise((resolve, reject) => {
          const started = Date.now()
          const expectedLabels = ['Idea', 'Sketch', 'Build', 'Ship']
          const tick = () => {
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
              resolve({ sceneCount: scene.length, savedCount: saved.length, arrows, labels })
              return
            }
            if (Date.now() - started > 15000) {
              reject(new Error('Offline smoke did not render the expected 4-step flow'))
              return
            }
            setTimeout(tick, 250)
          }
          tick()
        })
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
