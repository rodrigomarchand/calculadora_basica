// ============================================================
// S_CALC — Service Worker
// Estratégia: Cache First para arquivos locais,
//             Network First para Tailwind CDN
// ============================================================

const CACHE_NAME   = 'scalc-v1.4';
const CACHE_STATIC = 'scalc-static-v1.4';

// Arquivos locais que sempre devem estar no cache (offline total)
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// ── Instalação: pré-carrega arquivos locais ──────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// ── Ativação: remove caches antigos ─────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_STATIC)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: estratégia híbrida ────────────────────────────────
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Tailwind CDN → Network First (usa cache se offline)
    if (url.includes('cdn.tailwindcss.com')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Arquivos locais → Cache First
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Não estava no cache: busca na rede e armazena
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200) return response;
                const clone = response.clone();
                caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
                return response;
            });
        })
    );
});
