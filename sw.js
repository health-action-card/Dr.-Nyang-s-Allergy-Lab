/* 서비스 워커 — 화면 파일을 저장해 두어 인터넷이 끊겨도 앱이 열려요.
   ※ 파일을 고쳐서 다시 올릴 때는 아래 VERSION 숫자를 하나 올려 주세요. (예: v1 → v2)
   ※ 학생 기록은 여기 저장되지 않아요 (기록은 각 기기의 LocalStorage에만). */
const VERSION = 'v7';
const CACHE = 'allergy-shield-' + VERSION;
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/lab.css',
  './css/style.css',
  './js/app.js',
  './js/card.js',
  './js/core.js',
  './js/lab.js',
  './js/qr.js',
  './js/sfx.js',
  './data/holidays.js',
  './data/lab-items.js',
  './data/rules.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/cards/bg_certificate.jpg',
  './assets/cards/bg_lab.jpg',
  './assets/cards/bg_playground.jpg',
  './assets/characters/pinky_01.png',
  './assets/characters/pinky_02.png',
  './assets/characters/pinky_03.png',
  './assets/characters/pinky_04.png',
  './assets/characters/pinky_05.png',
  './assets/lab/pieces/light-0.jpg',
  './assets/lab/pieces/light-1.jpg',
  './assets/lab/pieces/light-2.jpg',
  './assets/lab/pieces/severe-0.jpg',
  './assets/lab/pieces/severe-1.jpg',
  './assets/lab/pieces/severe-2.jpg',
  './assets/lab/pieces/sym_hives.jpg',
  './assets/lab/scenes/s00.jpg',
  './assets/lab/scenes/s01.jpg',
  './assets/lab/scenes/s02.jpg',
  './assets/lab/scenes/s03.jpg',
  './assets/lab/scenes/s04.jpg',
  './assets/lab/scenes/s05.jpg',
  './assets/lab/scenes/s06.jpg',
  './assets/lab/scenes/s07.jpg',
  './assets/lab/scenes/s08.jpg',
  './assets/lab/scenes/s09.jpg',
  './assets/lab/scenes/s10.jpg',
  './assets/lab/scenes/s11.jpg',
  './assets/lab/scenes/s12.jpg',
  './assets/lab/scenes/s13.jpg',
  './assets/lab/scenes/s14.jpg',
  './assets/lab/scenes/s14a.jpg',
  './assets/lab/scenes/s15.jpg',
  './assets/lab/scenes/s16.jpg',
  './assets/lab/scenes/s17.jpg',
  './assets/lab/scenes/s18.jpg',
  './assets/lab/scenes/s19.jpg',
  './assets/lab/scenes/s20.jpg',
  './assets/lab/scenes/s21.jpg',
  './assets/lab/scenes/s22.jpg',
  './assets/lab/scenes/s23.jpg',
  './assets/lab/scenes/s23a.jpg',
  './assets/lab/scenes/s24.jpg',
  './assets/lab/scenes/s25.jpg',
  './assets/lab/scenes/s26.jpg',
  './assets/lab/scenes/s27.jpg',
  './assets/lab/scenes/s28.jpg',
  './assets/lab/scenes/s29.jpg',
  './assets/lab/scenes/s30.jpg',
  './assets/lab/scenes/s31.jpg',
  './assets/lab/scenes/s32.jpg',
  './assets/lab/scenes/s33.jpg',
  './assets/lab/scenes/s36_1.jpg',
  './assets/lab/scenes/s36_2.jpg',
  './assets/lab/scenes/s36_3.jpg',
  './assets/lab/scenes/s37.jpg',
  './assets/lab/scenes/s38.jpg',
  './assets/lab/scenes/s38a.jpg',
  './assets/medals/medal_blue.png',
  './assets/medals/medal_green.png',
  './assets/medals/medal_pink.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* 화면(HTML)은 인터넷 먼저 → 실패하면 저장본 / 나머지 파일은 저장본 먼저 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
