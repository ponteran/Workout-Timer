// Offline support: network first (so updates arrive immediately), cache as
// fallback when offline.
const CACHE = 'workout-timer-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './routine.js',
  './app.js',
  './audio/exercises.json',
  './manifest.webmanifest',
  './fonts/BebasNeue-Regular.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './audio/silence.mp3',
  './audio/coach/next.mp3',
  './audio/coach/first.mp3',
  './audio/coach-uk/next.mp3',
  './audio/coach-uk/first.mp3',
  './audio/warm/next.mp3',
  './audio/warm/first.mp3',
  './audio/coach/work.mp3',
  './audio/coach/rest.mp3',
  './audio/coach/ready.mp3',
  './audio/coach/complete.mp3',
  './audio/coach/1.mp3',
  './audio/coach/2.mp3',
  './audio/coach/3.mp3',
  './audio/coach/4.mp3',
  './audio/coach/5.mp3',
  './audio/coach/6.mp3',
  './audio/coach/7.mp3',
  './audio/coach/8.mp3',
  './audio/coach/9.mp3',
  './audio/coach/10.mp3',
  './audio/coach-uk/work.mp3',
  './audio/coach-uk/rest.mp3',
  './audio/coach-uk/ready.mp3',
  './audio/coach-uk/complete.mp3',
  './audio/coach-uk/1.mp3',
  './audio/coach-uk/2.mp3',
  './audio/coach-uk/3.mp3',
  './audio/coach-uk/4.mp3',
  './audio/coach-uk/5.mp3',
  './audio/coach-uk/6.mp3',
  './audio/coach-uk/7.mp3',
  './audio/coach-uk/8.mp3',
  './audio/coach-uk/9.mp3',
  './audio/coach-uk/10.mp3',
  './audio/warm/work.mp3',
  './audio/warm/rest.mp3',
  './audio/warm/ready.mp3',
  './audio/warm/complete.mp3',
  './audio/warm/1.mp3',
  './audio/warm/2.mp3',
  './audio/warm/3.mp3',
  './audio/warm/4.mp3',
  './audio/warm/5.mp3',
  './audio/warm/6.mp3',
  './audio/warm/7.mp3',
  './audio/warm/8.mp3',
  './audio/warm/9.mp3',
  './audio/warm/10.mp3',
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
