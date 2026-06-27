// Lumen Light service worker — enables installable, standalone PWA behavior.
// Strategy: network-first for same-origin GETs (so the app always gets the
// latest CDN build), with a cached app-shell fallback for offline navigations.
// The /api/* proxy routes are never intercepted or cached.

const CACHE = 'lumen-shell-v1'
const SHELL = ['/', '/index.html']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req)
        if (req.mode === 'navigate') {
          const cache = await caches.open(CACHE)
          cache.put('/index.html', fresh.clone()).catch(() => {})
        }
        return fresh
      } catch {
        const cached = await caches.match(req)
        return cached || (await caches.match('/index.html'))
      }
    })(),
  )
})
