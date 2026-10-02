// Network-first so new pushes show up on next app open; cached copy keeps it working offline in stores.
// The 24MB model rarely changes, so it's cache-first.
const C='shelfscan-cache';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  const model=e.request.url.includes('/model/');
  e.respondWith((async()=>{const c=await caches.open(C);
    if(model){const hit=await c.match(e.request);if(hit)return hit}
    try{const r=await fetch(e.request,{cache:'no-cache'});if(r.ok)c.put(e.request,r.clone());return r}
    catch(err){const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;throw err}})())});
