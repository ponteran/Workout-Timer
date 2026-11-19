// Offline support: network first (so updates arrive immediately), cache as
// fallback when offline.
const CACHE = 'workout-timer-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './fonts/BebasNeue-Regular.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './audio/silence.mp3',
  './audio/work.mp3',
  './audio/rest.mp3',
  './audio/ready.mp3',
  './audio/complete.mp3',
  './audio/1.mp3',
  './audio/2.mp3',
  './audio/3.mp3',
  './audio/4.mp3',
  './audio/5.mp3',
  './audio/6.mp3',
  './audio/7.mp3',
  './audio/8.mp3',
  './audio/9.mp3',
  './audio/10.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
