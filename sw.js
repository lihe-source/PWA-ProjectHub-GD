const BUILD='1791692737435';
const APP_VERSION='1.0.1';
const PREFIX='pwa-projecthub:'+encodeURIComponent(new URL(self.registration.scope).pathname)+':';
const CACHE=PREFIX+BUILD;
const SHELL=['index.html','styles.css','app.js','core.js','api.js','seed.js','update.js','manifest.webmanifest','favicon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
const urls=SHELL.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const manifestResponse=await fetch(new URL('version.json',self.registration.scope),{cache:'no-store'});
  if(!manifestResponse.ok)throw new Error('Version manifest unavailable');
  const manifest=await manifestResponse.json();
  if(manifest.version!==APP_VERSION||String(manifest.build)!==BUILD)throw new Error('Deployment version mismatch');
  const responses=await Promise.all(SHELL.map(async path=>{
    const url=new URL(path,self.registration.scope).href;
    const response=await fetch(url,{cache:'reload'});
    if(!response.ok)throw new Error('Shell asset unavailable: '+path);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
    if(manifest.files?.[path]!==hash)throw new Error('Shell integrity mismatch: '+path);
    return [url,response];
  }));
  const cache=await caches.open(CACHE);
  try{for(const [url,response] of responses)await cache.put(url,response);}catch(e){await caches.delete(CACHE);throw e;}
})()));
self.addEventListener('message',event=>{if(event.data?.type==='APPLY_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,u=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
  if(u.pathname===new URL('version.json',self.registration.scope).pathname)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(urls[0])||fetch(request);})());return;
  }
  u.search='';u.hash='';
  if(urls.includes(u.href))event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(u.href)||fetch(request);})());
});
