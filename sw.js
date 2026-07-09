// Hello Billiard 서비스워커 — 오프라인 캐시
// 버전을 올리면 이전 캐시가 정리되고 새 파일이 배포된다.
const VERSION = 'hb-v17';
const SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/bricolage-grotesque-latin.woff2',
  './fonts/spline-sans-mono-latin.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 폰트는 자체 호스팅으로 바뀌어 아래 동일 오리진 경로가 처리한다.
  // (구글 폰트 런타임 캐시 분기는 제거됨 — 외부 요청이 더는 없다)
  if (url.origin !== location.origin) return;

  // 앱 셸: 네트워크 우선(항상 최신), 실패 시 캐시 (오프라인 동작)
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      // 오프라인: 캐시에 없고 페이지 이동이면 앱 셸(루트)로 폴백.
      // 옛 주소(/HelloBilli.html)로 시작하는 기존 설치 앱도 여기서 구제된다.
      caches.match(e.request).then(hit =>
        hit || (e.request.mode === 'navigate' ? caches.match('./') : undefined))
    )
  );
});
