// Service worker: precarga la app (index + recursos con hash que enlaza) y sirve todo sin red.
const VERSION = 'aj-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

async function precache() {
  const cache = await caches.open(VERSION);
  await cache.addAll(CORE);
  // descubre los recursos de Vite (assets/...) leyendo index.html
  try {
    const res = await fetch('./index.html', { cache: 'no-store' });
    const html = await res.text();
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => u.includes('assets/'));
    await cache.addAll(urls);
  } catch (e) {
    /* sin red durante la instalación: se cacheará al usarse */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navegación: red primero (para actualizar), caché si no hay red
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // recursos: caché primero, y se guarda lo nuevo
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => hit || caches.match(req.url, { ignoreVary: true, ignoreSearch: false })).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
