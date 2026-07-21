import { AudioDirector } from './audio.js';
import { Game } from './game.js';
import { createProductionAssets } from './assets.js';

const VERSION='3.6.0-pages-resilience-polish';
const canvas=document.getElementById('game');
const status=document.getElementById('status');
const bootOverlay=document.getElementById('boot-overlay');
const bootProgress=document.getElementById('boot-progress');
const bootMessage=document.getElementById('boot-message');
const bootRetry=document.getElementById('boot-retry');
const systemBanner=document.getElementById('system-banner');
const systemMessage=document.getElementById('system-message');
const systemAction=document.getElementById('system-action');
const systemDismiss=document.getElementById('system-dismiss');
const audio=new AudioDirector();

function showSystemMessage(message,{actionLabel='',onAction=null,persistent=false}={}){
  systemMessage.textContent=message;
  systemAction.hidden=!actionLabel;
  systemAction.textContent=actionLabel||'Reload now';
  systemAction.onclick=onAction;
  systemBanner.hidden=false;
  systemBanner.dataset.persistent=String(persistent);
}
function hideSystemMessage(){if(systemBanner.dataset.persistent!=='true')systemBanner.hidden=true;}
systemDismiss.addEventListener('click',()=>{systemBanner.dataset.persistent='false';systemBanner.hidden=true;});
bootRetry.addEventListener('click',()=>location.reload());

status.textContent='Loading production artwork…';
const bootStarted=performance.now();
const assets=createProductionAssets({onProgress:({completed,total,src})=>{
  const percent=Math.round(completed/total*100);
  bootProgress.value=percent;
  bootProgress.textContent=`${percent}%`;
  bootMessage.textContent=`Preparing ${src.split('/').pop()} · ${completed}/${total}`;
}});
try{
  await assets.ready;
  const remaining=Math.max(0,450-(performance.now()-bootStarted));
  if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));
}catch(error){
  document.body.dataset.boot='error';
  bootMessage.textContent='The production artwork could not be loaded. Check the connection and reload.';
  bootRetry.hidden=false;
  status.textContent='Production artwork failed to load. Reload to retry.';
  throw error;
}

const game=new Game(canvas,audio,assets);
document.body.dataset.boot='ready';
bootProgress.value=100;
bootMessage.textContent='The Vault is ready.';
bootOverlay.classList.add('is-hidden');
setTimeout(()=>{bootOverlay.hidden=true;},320);
status.textContent='Ready. Use arrows or WASD to move; Tab navigates menus.';
const launchAction=new URLSearchParams(location.search).get('action');
if(launchAction==='levels')game.setScreen('levelSelect');
else if(launchAction==='continue')game.startCampaign();
if(launchAction)history.replaceState(null,'',location.pathname+location.hash);

canvas.addEventListener('pointerdown',()=>canvas.focus(),{passive:true});
canvas.focus({preventScroll:true});

if('serviceWorker'in navigator&&location.protocol==='https'){
  let reloadForUpdate=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadForUpdate)location.reload();});
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});
      const offerUpdate=worker=>showSystemMessage('A polished Vault update is ready. Reload when you are between moves.',{
        actionLabel:'Reload now',
        persistent:true,
        onAction:()=>{reloadForUpdate=true;worker?.postMessage({type:'SKIP_WAITING'});}
      });
      if(registration.waiting&&navigator.serviceWorker.controller)offerUpdate(registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(worker);
        });
      });
      setInterval(()=>registration.update().catch(()=>{}),60*60*1000);
    }catch(error){
      console.warn('Offline cache registration failed.',error);
      showSystemMessage('Offline play could not be enabled, but the online game is still available.');
    }
  });
}

window.addEventListener('offline',()=>showSystemMessage('Connection lost. The cached Vault remains playable offline.',{persistent:true}));
window.addEventListener('online',()=>{systemBanner.dataset.persistent='false';showSystemMessage('Connection restored. Progress remains saved on this device.');setTimeout(hideSystemMessage,3200);});

let lastAnnouncement='';
function announceState(){
  const focused=game.buttons?.[game.focusIndex]?.label||'';
  const activeToast=game.toast?.message??'';
  const snapshot=`${game.screen}|${game.levelIndex}|${game.turns}|${game.remainingShards?.()??''}|${focused}|${activeToast}`;
  if(snapshot===lastAnnouncement)return;
  lastAnnouncement=snapshot;
  if(activeToast)status.textContent=activeToast;
  else if(game.screen==='playing')status.textContent=`Room ${game.levelIndex+1}, ${game.level?.name}. ${game.turns} turns. ${game.remainingShards()} Prism Sparks remain.`;
  else if(game.screen==='victory')status.textContent=`Room restored in ${game.turns} turns. ${focused||'Choose the next action.'}`;
  else if(game.screen==='defeat')status.textContent=`Pip was caught. ${focused||'Undo or retry.'}`;
  else if(focused)status.textContent=`${game.screen} menu. Selected: ${focused}.`;
}
setInterval(announceState,250);

const gamepadState=new Map();
function pollGamepads(now){
  const connected=new Set();
  for(const pad of navigator.getGamepads?.()??[]){
    if(!pad)continue;
    connected.add(pad.index);
    const previous=gamepadState.get(pad.index)??{pressed:new Set(),repeatAt:new Map()};
    const pressed=new Set();
    const axisX=pad.axes[0]??0,axisY=pad.axes[1]??0;
    if(pad.buttons[12]?.pressed||axisY<-.55)pressed.add('ArrowUp');
    if(pad.buttons[13]?.pressed||axisY>.55)pressed.add('ArrowDown');
    if(pad.buttons[14]?.pressed||axisX<-.55)pressed.add('ArrowLeft');
    if(pad.buttons[15]?.pressed||axisX>.55)pressed.add('ArrowRight');
    if(pad.buttons[0]?.pressed)pressed.add('Enter');
    if(pad.buttons[1]?.pressed)pressed.add('z');
    if(pad.buttons[2]?.pressed)pressed.add('r');
    if(pad.buttons[3]?.pressed)pressed.add('h');
    if(pad.buttons[8]?.pressed||pad.buttons[9]?.pressed)pressed.add('Escape');
    for(const key of pressed){
      const directional=key.startsWith('Arrow');
      const newlyPressed=!previous.pressed.has(key);
      const repeatAt=previous.repeatAt.get(key)??0;
      if(newlyPressed||(directional&&now>=repeatAt)){
        audio.unlock();
        game.handleKey(key);
        previous.repeatAt.set(key,now+(newlyPressed?240:115));
      }
    }
    previous.pressed=pressed;
    gamepadState.set(pad.index,previous);
  }
  for(const index of gamepadState.keys())if(!connected.has(index))gamepadState.delete(index);
  requestAnimationFrame(pollGamepads);
}
requestAnimationFrame(pollGamepads);

function reportRuntimeError(message,error){
  status.textContent=message;
  showSystemMessage(message,{actionLabel:'Reload game',persistent:true,onAction:()=>location.reload()});
  console.error(error);
}
window.addEventListener('error',event=>reportRuntimeError('The game encountered an error. Your saved progress is safe; reload to retry.',event.error??event.message));
window.addEventListener('unhandledrejection',event=>reportRuntimeError('The game encountered an unexpected error. Your saved progress is safe; reload to retry.',event.reason));
window.PIP_GAME={game,audio,version:VERSION,loadLevel:index=>game.loadLevel(index),snapshot:()=>({screen:game.screen,level:game.levelIndex,turns:game.turns,shards:game.remainingShards?.()??null})};
