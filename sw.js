// 오프라인 캐시 + 알림 클릭 처리
const VERSION = 'nolgot-v3';
const LIB_CACHE = 'nolgot-lib-v1';   // 버전 고정 CDN 라이브러리 (Leaflet 1.9.4) — 캐시 우선
const LIB_HOST = 'cdnjs.cloudflare.com';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'i18n.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== LIB_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // 지도 라이브러리(버전 고정 URL): 캐시 우선. 지도 타일·지오코딩 등 다른 외부 요청은 건드리지 않음.
  if (url.host === LIB_HOST && url.pathname.startsWith('/ajax/libs/leaflet/1.9.4/')) {
    e.respondWith(caches.open(LIB_CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // 앱 코드와 이벤트 데이터(도시별 JSON 포함)는 네트워크 우선(항상 최신), 실패하면 캐시
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
