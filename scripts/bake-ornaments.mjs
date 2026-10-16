// Recupera os desenhos originais do Nilo em imagens locais usadas também pelo Blender.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const target=resolve('art/textures'); await mkdir(target,{recursive:true});
const port=9817, profile=await mkdtemp(join(tmpdir(),'nilo-texture-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try {
  let tabs; for(let i=0;i<50;i++){try{tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break;}catch{await new Promise(r=>setTimeout(r,150));}}
  ws=new WebSocket(tabs.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
  const pending=new Map(); let id=0;ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}});
  const send=(method,params)=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
  const font=(await readFile('node_modules/@fontsource/reem-kufi/files/reem-kufi-latin-600-normal.woff2')).toString('base64');
  const source=(await readFile('src/scenes/textures.js','utf8')).replace(/^import .*;\r?\n/m,'').replaceAll('export function','function');
  const expression=`(async()=>{const THREE={CanvasTexture:class{constructor(c){this.image=c;this.repeat={set(){}}}},RepeatWrapping:1,ClampToEdgeWrapping:2,SRGBColorSpace:3};
    const font=new FontFace('Reem Kufi','url(data:font/woff2;base64,${font})',{weight:'600'});document.fonts.add(await font.load());
    ${source}
    const outputs={dome:domeTexture().image};
    for(const [key,text] of [['inscription-upper','MEDIR PARA NÃO FALTAR'],['inscription-lower','QUEM MEDE NÃO FICA SEM']]){const [c,ctx]=canvas(2048,256);kuficPanel(ctx,text,0,0,2048,256);outputs[key]=c;}
    const [c,ctx]=canvas(1024,128);arabesqueBand(ctx,0,0,1024,128);outputs.frieze=c;
    return Object.fromEntries(Object.entries(outputs).map(([k,c])=>[k,c.toDataURL('image/png').split(',')[1]]));})()`;
  const answer=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(answer.result?.exceptionDetails)throw new Error(answer.result.exceptionDetails.text);
  for(const [key,value] of Object.entries(answer.result.result.value)){await writeFile(join(target,key+'.png'),Buffer.from(value,'base64'));console.log(key+'.png');}
} finally {ws?.close();chrome.kill();}
