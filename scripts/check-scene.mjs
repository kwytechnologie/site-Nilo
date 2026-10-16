// QA reproduzível no Chrome local: node scripts/check-scene.mjs <buildDir> <label> [mobile]
// Emulação de viewport/CPU, não substitui medir em um aparelho físico.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
const [rootArg = 'dist', label = 'current', mode = 'desktop'] = process.argv.slice(2);
const root = resolve(rootArg), mobile = mode === 'mobile';
const output = resolve('.qa', `${label}-${mode}`);
await mkdir(output, { recursive: true });
const mime = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.glb':'model/gltf-binary', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/site-Nilo\/?/, '');
    if (!relative || relative === '/') relative = 'index.html';
    const file = resolve(root, relative.replace(/^\//, ''));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = await mkdtemp(join(tmpdir(), 'nilo-qa-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--ignore-gpu-blocklist', 'about:blank'
], { stdio: 'ignore', windowsHide: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let tabs;
  for (let i=0;i<60;i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r));
  let serial=0; const pending=new Map(), errors=[], badRequests=[];
  socket.addEventListener('message', e => {
    const m=JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method==='Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) errors.push(m.params.args.map(a=>a.value ?? a.description).join(' '));
    if (m.method==='Network.responseReceived' && m.params.response.status>=400) badRequests.push(m.params.response.url);
  });
  const send=(method,params={})=>new Promise((r,j)=>{const id=++serial; const timer=setTimeout(()=>{pending.delete(id);j(new Error(method+' timeout'));},45000);pending.set(id,m=>{clearTimeout(timer);m.error?j(new Error(JSON.stringify(m.error))):r(m.result);});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression => (await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result?.value;
  for (const domain of ['Runtime','Page','Network']) await send(`${domain}.enable`);
  await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:900,deviceScaleFactor:mobile?2:1,mobile});
  if(mobile){await send('Emulation.setTouchEmulationEnabled',{enabled:true});await send('Emulation.setCPUThrottlingRate',{rate:4});}
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__qa={tasks:[],frames:[],draws:0,triangles:0,last:0};
    new PerformanceObserver(l=>__qa.tasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
    for(const proto of [WebGL2RenderingContext.prototype,WebGLRenderingContext.prototype]) {
      for(const key of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
        const original=proto[key]; if(!original)continue;
        proto[key]=function(...a){__qa.draws++;const n=key.includes('Elements')?a[1]:a[2];const instances=key.includes('Instanced')?a.at(-1):1;if(a[0]===4)__qa.triangles+=n/3*instances;return original.apply(this,a);};
      }
    }
    function sample(t){if(__qa.last)__qa.frames.push({ms:t-__qa.last,draws:__qa.draws,triangles:__qa.triangles});__qa.last=t;__qa.draws=0;__qa.triangles=0;requestAnimationFrame(sample)}requestAnimationFrame(sample);
  `});
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/site-Nilo/?debug3d`});
  await sleep(mobile?10000:6500);
  const samples=[];
  const route=process.env.NILO_QA_PORTAL
    ? [['guardas','portal',.65],['porta-abrindo','portal',.81],['travessia','portal',.94],['limiar','#nilometro',0],['cupula','#nilometro',.16],['coluna','#nilometro',.30],['escada','#nilometro',.68],['poco-fundo','#nilometro',.94]]
    : [['rio','#rio',0],['rio-meio','#rio',.5],['porta','portal',.81],['poco-entrada','#nilometro',.16],['poco-meio','#nilometro',.68],['poco-fundo','#nilometro',.94]];
  const selected=process.env.NILO_QA_SCENE ? route.filter(r=>r[0]===process.env.NILO_QA_SCENE) : process.env.NILO_QA_QUICK ? route.slice(0,1) : route;
  for(const [name,id,p] of selected) {
    await evaluate(id==='portal'
      ? `(()=>{const d=document.querySelector('[data-porta]'),n=document.querySelector('#nilometro');const top=d.getBoundingClientRect().top+scrollY;scrollTo({top:top+(n.offsetTop-top)*${p},behavior:'instant'});})()`
      : `(()=>{const e=document.querySelector('${id}');scrollTo({top:e.offsetTop+(e.offsetHeight-innerHeight)*${p},behavior:'instant'});})()`);
    await sleep(2200);
    await evaluate('__qa.frames=[]'); await sleep(1600);
    const sample=await evaluate(`(()=>{const f=__qa.frames;const v=f.map(x=>x.ms).sort((a,b)=>a-b);const active=f.filter(x=>x.draws);const c=document.querySelector('#stage');const gl=c.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return {scene:document.body.dataset.cena,fallback:document.documentElement.className,medianMs:v[Math.floor(v.length*.5)],p95Ms:v[Math.floor(v.length*.95)],maxMs:Math.max(...v),drawCalls:Math.round(active.reduce((s,f)=>s+f.draws,0)/Math.max(1,active.length)),triangles:Math.round(active.reduce((s,f)=>s+f.triangles,0)/Math.max(1,active.length)),debug:window.__niloDebug?JSON.parse(JSON.stringify(window.__niloDebug)):null,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    if(process.env.NILO_QA_CLEAN)await evaluate(`window.__cleanStyle=document.createElement('style');__cleanStyle.textContent='body > :not(.stage){visibility:hidden!important}';document.head.append(__cleanStyle)`);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,`${name}.png`),Buffer.from(shot.data,'base64'));
    if(process.env.NILO_QA_CLEAN)await evaluate('__cleanStyle.remove()');
    if (process.env.NILO_QA_POSTERS && ['rio','poco-meio'].includes(name)) {
      await evaluate(`window.__posterStyle=document.createElement('style');__posterStyle.textContent='body > :not(.stage){visibility:hidden!important}.stage__veil{opacity:0!important}';document.head.append(__posterStyle)`);
      const poster=await send('Page.captureScreenshot',{format:'jpeg',quality:87});
      await writeFile(join(output,name==='rio'?'poster-rio.jpg':'poster-poco.jpg'),Buffer.from(poster.data,'base64'));
      await evaluate('__posterStyle.remove()');
    }
    samples.push({name,...sample});
  }
  const tasks=await evaluate('__qa.tasks');
  const resources=await evaluate(`performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),bytes:e.transferSize,duration:e.duration}))`);
  const runtimeErrors=[...errors], initialBadRequests=[...badRequests], checks=[];
  if(process.env.NILO_QA_CHECKS) {
    const base=`http://127.0.0.1:${server.address().port}/site-Nilo/`;
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    const seam=[];
    for(const delta of [-2,0,2,0,-2]){
      await evaluate(`scrollTo({top:document.querySelector('#nilometro').offsetTop+${delta},behavior:'instant'})`);await sleep(120);
      seam.push(await evaluate(`({p:__niloDebug.cameraWorldPosition,q:__niloDebug.cameraWorldQuaternion,fov:__niloDebug.cameraFov,veil:getComputedStyle(document.querySelector('.stage__veil')).opacity})`));
    }
    const differences=seam.slice(1).map((v,i)=>({distance:Math.hypot(...v.p.map((x,k)=>x-seam[i].p[k])),dot:Math.abs(v.q.reduce((s,x,k)=>s+x*seam[i].q[k],0)),fov:Math.abs(v.fov-seam[i].fov)}));
    checks.push({name:'portal continuous forward and reverse, no black veil',pass:differences.every(v=>v.distance<.03&&v.dot>.999&&v.fov<.02)&&seam.every(v=>Number(v.veil)===0),differences});
    await evaluate(`(()=>{const d=document.querySelector('[data-porta]'),n=document.querySelector('#nilometro');const t=d.getBoundingClientRect().top+scrollY;scrollTo({top:t+(n.offsetTop-t)*.95,behavior:'instant'})})()`);await sleep(150);
    checks.push({name:'doors and spears fully clear the entrance',pass:await evaluate(`(()=>{const a=__niloDebug.doorAngles;return Math.abs(a.doorLeft+1.4)<.001&&Math.abs(a.doorRight-1.4)<.001&&Math.abs(a.spearLeft-.70)<.001&&Math.abs(a.spearRight+.70)<.001})()`)});
    await evaluate('scrollTo(0,0)');await sleep(300);await evaluate('__qa.frames=[]');await sleep(350);
    checks.push({name:'reduced-motion: no idle draws',pass:await evaluate('__qa.frames.reduce((n,f)=>n+f.draws,0)===0')});
    if(mobile) {
      await evaluate("document.querySelector('[data-menu]').click()");
      checks.push({name:'menu opens',pass:await evaluate("!document.getElementById('menu-movel').hidden")});
      await evaluate("document.querySelector('#menu-movel a[href=\"#perguntas\"]').click()");await sleep(150);
      checks.push({name:'menu anchor reaches well',pass:await evaluate("document.getElementById('menu-movel').hidden && location.hash==='#perguntas' && __niloDebug.activeScene==='poco'")});
    }
    await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile});await sleep(300);
    checks.push({name:'landscape resize',pass:await evaluate("__niloDebug.ready && document.documentElement.scrollWidth<=innerWidth && Math.abs(document.querySelector('#stage').width/document.querySelector('#stage').height-innerWidth/innerHeight)<.02")});
    await send('Page.navigate',{url:base+'?debug3d&direct=1#perguntas'});await sleep(3500);
    checks.push({name:'direct link to well',pass:await evaluate("__niloDebug.ready && __niloDebug.activeScene==='poco' && !__niloDebug.fallback")});
    await evaluate("document.querySelector('#stage').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()");await sleep(200);
    checks.push({name:'context loss fallback',pass:await evaluate("document.documentElement.classList.contains('sem-3d') && document.documentElement.classList.contains('no-poco')")});
    await send('Page.navigate',{url:base+'?sem3d#perguntas'});await sleep(600);
    checks.push({name:'sem3d fallback',pass:await evaluate("document.documentElement.classList.contains('sem-3d') && document.documentElement.classList.contains('no-poco')")});
    await send('Network.setBlockedURLs',{urls:['*nilometer.glb*']});
    await send('Page.navigate',{url:base+'?debug3d&failed=1#perguntas'});await sleep(3500);
    checks.push({name:'failed model keeps readable poster',pass:await evaluate("__niloDebug.fallback && !__niloDebug.loading && !!__niloDebug.error && getComputedStyle(document.querySelector('main')).visibility!=='hidden'")});
  }
  const report={label,mode,cpuThrottle:mobile?4:1,samples,longTasks:tasks,errors:runtimeErrors,badRequests:initialBadRequests,resources,checks};
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({label,mode,samples,longTasks:tasks.length,errors:runtimeErrors,badRequests:initialBadRequests,checks},null,2));
  if(runtimeErrors.length || initialBadRequests.length || samples.some(s=>s.overflow || s.fallback?.includes('sem-3d')) || checks.some(c=>!c.pass))process.exitCode=1;
} finally {
  if(socket?.readyState===WebSocket.OPEN) {
    socket.send(JSON.stringify({id:999999,method:'Browser.close'}));
    await sleep(300);
    socket.close();
  }
  if(chrome.exitCode===null)chrome.kill();
  server.close();
}
