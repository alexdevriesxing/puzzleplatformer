const REVISION='__BUILD_REVISION__';
const CACHE=`pip-prism-vault-${REVISION}`;
const CORE=[
  './','./index.html','./health.json','./manifest.webmanifest','./src/style.css','./src/main.js','./src/game.js','./src/levels.js','./src/room-data.js','./src/assets.js','./src/audio.js','./src/art.js',
  './assets/commercial/app-icon-192.png','./assets/commercial/app-icon-512.png','./assets/commercial/app-icon-maskable-192.png','./assets/commercial/app-icon-maskable-512.png','./assets/commercial/favicon.png','./assets/commercial/og-image.webp','./assets/commercial/install-wide.webp','./assets/commercial/install-narrow.webp','./assets/commercial/key-art.webp','./assets/commercial/logo.png','./assets/commercial/hero-sprites.png','./assets/commercial/enemy-sprites.png','./assets/commercial/object-sprites.png','./assets/commercial/collectible-sprites.png','./assets/commercial/tile-sprites.png','./assets/commercial/vfx-sprites.png','./assets/commercial/ui-atlas.png','./assets/commercial/asset-manifest.json',
  './assets/commercial/backdrop-01.webp','./assets/commercial/backdrop-02.webp','./assets/commercial/backdrop-03.webp','./assets/commercial/backdrop-04.webp','./assets/commercial/backdrop-05.webp','./assets/commercial/backdrop-06.webp','./assets/commercial/backdrop-07.webp','./assets/commercial/backdrop-08.webp','./assets/commercial/backdrop-09.webp','./assets/commercial/backdrop-10.webp',
  './assets/commercial/comic-1.webp','./assets/commercial/comic-2.webp','./assets/commercial/comic-3.webp','./assets/commercial/comic-4.webp','./assets/commercial/comic-5.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('pip-prism-vault-')).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request,event){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(request,{ignoreSearch:true});
  if(hit){
    event.waitUntil(fetch(request).then(response=>{if(response.ok)return cache.put(request,response.clone());}).catch(()=>{}));
    return hit;
  }
  const response=await fetch(request);
  if(response.ok)await cache.put(request,response.clone());
  return response;
}

async function cachedFallback(cache,request){
  const exact=await cache.match(request,{ignoreSearch:true});
  if(exact)return exact;
  if(request.mode==='navigate')return cache.match('./index.html');
  return null;
}

async function networkFirst(request,event){
  const cache=await caches.open(CACHE);
  try{
    const response=(await event.preloadResponse)??await fetch(request);
    if(response.ok){await cache.put(request,response.clone());return response;}
    if(response.status>=500){
      const hit=await cachedFallback(cache,request);
      if(hit)return hit;
    }
    return response;
  }catch(error){
    const hit=await cachedFallback(cache,request);
    if(hit)return hit;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const immutable=url.pathname.includes('/assets/commercial/');
  event.respondWith(immutable?cacheFirst(request,event):networkFirst(request,event));
});
