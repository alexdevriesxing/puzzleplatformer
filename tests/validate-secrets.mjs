const storageMap=new Map();
globalThis.localStorage={
  getItem:key=>storageMap.has(key)?storageMap.get(key):null,
  setItem:(key,value)=>storageMap.set(key,String(value)),
  removeItem:key=>storageMap.delete(key),
};
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.requestAnimationFrame=()=>0;
Object.defineProperty(globalThis,'navigator',{value:{vibrate(){},getGamepads(){return[];}},configurable:true});
const app={dataset:{}};
const touch={setAttribute(){},inert:false};
globalThis.document={hidden:false,fullscreenElement:null,addEventListener(){},exitFullscreen(){},querySelectorAll(){return[];},getElementById(id){return id==='app'?app:id==='touch-controls'?touch:null;}};
globalThis.window={addEventListener(){},AudioContext:null,webkitAudioContext:null};
const gradient={addColorStop(){}};
const ctx=new Proxy({canvas:null,measureText(value){return{width:String(value).length*9};},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},createPattern(){return{};}},{get(target,key){if(key in target)return target[key];if(typeof key==='symbol')return undefined;const fn=()=>{};target[key]=fn;return fn;},set(target,key,value){target[key]=value;return true;}});
const canvas={width:1280,height:720,style:{},getContext(){ctx.canvas=this;return ctx;},addEventListener(){},focus(){},requestFullscreen(){},setAttribute(){},getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};}};
const image={complete:true,naturalWidth:1600,naturalHeight:900};
const assets={keyArt:image,logo:image,heroSprites:image,enemySprites:image,objectSprites:image,collectibleSprites:image,tileSprites:image,vfxSprites:image,uiAtlas:image,comic1:image,comic2:image,comic3:image,comic4:image,comic5:image,backdrops:Array.from({length:10},()=>image)};
const played=[];const audio={enabled:true,play(name){played.push(name);},setSong(){},toggle(){this.enabled=!this.enabled;return this.enabled;},unlock(){}};
const {Game}=await import('../src/game.js');
const game=new Game(canvas,audio,assets);

for(const key of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'])game.handleKey(key);
if(!game.progress.secrets.archive||!game.settings.archiveMode||app.dataset.archive!=='true')throw new Error('Konami archive secret did not unlock and synchronize.');
for(const key of ['p','i','p'])game.handleKey(key);
if(!game.progress.secrets.pip)throw new Error('Pip name secret did not unlock.');
game.render(performance.now());game.mouse={x:340,y:160,down:false};for(let i=0;i<7;i++)game.handleClick();
if(!game.progress.secrets.lucky)throw new Error('Lucky-seven title ritual did not unlock.');
game.loadLevel(63);game.levelLoadedAt=0;game.update(0,7000);
if(!game.progress.secrets.room64)throw new Error('Room 64 idle secret did not unlock.');
game.setScreen('credits');for(const key of ['n','u','l','l'])game.handleKey(key);
if(!game.progress.secrets.null)throw new Error('Baron Null memo did not unlock.');
for(let i=0;i<100;i++)game.progress.stars[String(i)]=3;game.checkMasterSecret();
if(!game.progress.secrets.master||game.secretCount()!==6)throw new Error('Perfect-light mastery secret did not unlock.');
if(!played.includes('secret'))throw new Error('Secret discovery audio cue was not requested.');
const saved=JSON.parse(storageMap.get('pip.progress'));
if(Object.keys(saved.secrets??{}).length!==6)throw new Error('Secret discoveries were not persisted.');
console.log('✓ Six solution-neutral vault secrets unlock, persist, announce, render, and preserve normal campaign state.');
