/* Ops Console service worker — makes the phone install a real app and open offline.

   Everything is NETWORK-FIRST, and that is deliberate. A cache-first shell would mean every push to `main`
   needs a cache-version bump or phones keep running yesterday's index.html for days, which is the trap
   this repo's "push = deploy" model cannot afford. Network-first costs one round-trip when online (which
   the page makes anyway) and buys: always current when there is signal, last-known-good when there is not.

   Three caches:
   · SHELL — this origin: index.html, the JS modules, district geometry, icons. Pre-cached on install so
     the very first offline open works, refreshed on every successful fetch after that.
   · DATA  — Google Sheets CSV (every tab) and Open-Meteo. Keyed with the `t=` cache-buster REMOVED, or no
     offline request would ever match. A cached answer goes back with `X-SW-Cached-At` (epoch ms of the
     fetch that filled it), which loadData() turns into an "Offline · data as of …" badge — the last real
     data is shown, and never passed off as live. Weather is cached for the same reason: without it the
     app falls back to SIMULATED rain under a green "Live" badge (see the weather note in CLAUDE.md).
   · FONTS — Google Fonts, stale-while-revalidate (they never change under a URL).
   Anything else (analytics, the concern-form POST) passes straight through.

   Privacy note: the DATA cache holds the sheet, phone numbers included, on the device after the PIN
   expires. That is what offline means. The PIN gate is soft by design; see CLAUDE.md → PWA. */
const SHELL = 'ops-shell-v1', DATA = 'ops-data-v1', FONTS = 'ops-fonts-v1';
const PRECACHE = [
  './', './index.html', './machines.js', './mapdata.js', './manifest.webmanifest',
  './states/india/mapdata.js', './states/MH/mapdata.js', './states/TG/mapdata.js', './states/GJ/mapdata.js',
  './states/RJ/mapdata.js', './states/PB/mapdata.js', './states/HR/mapdata.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
];

self.addEventListener('install', e => {
  // One missing file must not fail the whole install, so each is added on its own.
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache:'reload' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  const keep = new Set([SHELL, DATA, FONTS]);
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !keep.has(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const dataKey = url => { const u = new URL(url); u.searchParams.delete('t'); return u.toString(); };

async function networkFirst(req, cacheName, key, stamp){
  const cache = await caches.open(cacheName);
  try{
    const res = await fetch(req);
    if(res.ok){
      if(stamp){
        // Store a copy carrying the fetch time, so a later offline answer can say how old it is.
        const body = await res.clone().blob(), h = new Headers(res.headers);
        h.set('X-SW-Cached-At', String(Date.now()));
        h.set('Access-Control-Expose-Headers', 'X-SW-Cached-At');   // readable from the page on a cross-origin answer
        await cache.put(key, new Response(body, { status:res.status, statusText:res.statusText, headers:h }));
      } else await cache.put(key, res.clone());
    }
    return res;
  }catch(err){
    const hit = await cache.match(key, { ignoreVary:true });
    if(hit) return hit;
    throw err;
  }
}
// For the shell, an offline navigation to any path inside the scope falls back to the cached index.html.
async function shell(req){
  try{ return await networkFirst(req, SHELL, req, false); }
  catch(err){
    const c = await caches.open(SHELL);
    const hit = await c.match(req, { ignoreSearch:true }) || (req.mode === 'navigate' ? await c.match('./index.html') || await c.match('./') : null);
    if(hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req){
  const cache = await caches.open(FONTS), hit = await cache.match(req);
  const net = fetch(req).then(res => { if(res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;                       // the concern form POSTs — never touch it
  const url = new URL(req.url);
  if(url.origin === self.location.origin){ e.respondWith(shell(req)); return; }
  if(url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets/')){ e.respondWith(networkFirst(req, DATA, dataKey(req.url), true)); return; }
  if(url.hostname === 'api.open-meteo.com'){ e.respondWith(networkFirst(req, DATA, dataKey(req.url), true)); return; }
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){ e.respondWith(staleWhileRevalidate(req)); return; }
  // everything else (analytics, …): browser default
});
