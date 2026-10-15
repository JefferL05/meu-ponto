import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../dist/',import.meta.url);
async function listar(dir,prefix=''){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())out.push(...await listar(new URL(e.name+'/',dir),name+'/'));else if(name!=='sw.js')out.push(name);}return out;}
const files=(await listar(root)).sort(),hash=createHash('sha256');
for(const f of files){hash.update(f);hash.update(await readFile(new URL(f,root)));}
const version=hash.digest('hex').slice(0,16);
await writeFile(new URL('sw.js',root),`// Gerado a partir do conteúdo completo do build.
const PREFIX='meuponto-v3:'+self.registration.scope+':';
const CACHE=PREFIX+'${version}';
const FILES=${JSON.stringify(files)};
const url=p=>new URL(p,self.registration.scope).href;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(url))));});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;
  e.respondWith((async()=>{const c=await caches.open(CACHE);
    if(e.request.mode==='navigate'){try{return await fetch(e.request);}catch{return await c.match(url('index.html'))??Response.error();}}
    return await c.match(e.request)??fetch(e.request);
  })());
});
`);
console.log(`Service worker ${version}: ${files.length} arquivos no pré-cache.`);
