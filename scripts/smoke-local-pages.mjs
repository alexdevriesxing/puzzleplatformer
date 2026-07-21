import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const port=8790;
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
const child=spawn('node',[wrangler,'pages','dev','dist','--ip','127.0.0.1','--port',String(port)],{
  stdio:['ignore','pipe','pipe'],
  detached:process.platform!=='win32'
});
let output='';
child.stdout.on('data',chunk=>{output+=chunk;});
child.stderr.on('data',chunk=>{output+=chunk;});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function stop(){
  if(child.exitCode!=null)return;
  if(process.platform==='win32')child.kill('SIGTERM');
  else process.kill(-child.pid,'SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(3000)]);
}

try{
  let response;
  for(let attempt=0;attempt<25;attempt++){
    if(child.exitCode!=null)throw new Error(`Wrangler Pages dev exited early.\n${output}`);
    try{
      response=await fetch(`http://127.0.0.1:${port}/health.json`,{signal:AbortSignal.timeout(2000)});
      if(response.ok)break;
    }catch{}
    await sleep(500);
  }
  if(!response?.ok)throw new Error(`Local Pages runtime did not become healthy.\n${output}`);
  const health=await response.json();
  if(health.status!=='ok'||health.deploymentTarget!=='cloudflare-pages')throw new Error('Local Pages health payload is invalid.');
  for(const [path,type] of [['/','text/html'],['/manifest.webmanifest','application/manifest+json'],['/assets/commercial/hero-sprites.png','image/png']]){
    const check=await fetch(`http://127.0.0.1:${port}${path}`);
    if(!check.ok||!(check.headers.get('content-type')??'').includes(type))throw new Error(`${path} failed local Pages smoke.`);
  }
  console.log(`✓ Local Cloudflare Pages runtime served version ${health.version}, revision ${health.revision}.`);
}finally{await stop();}
