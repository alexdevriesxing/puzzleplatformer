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
globalThis.document={
  hidden:false,
  fullscreenElement:null,
  addEventListener(){},
  exitFullscreen(){},
  querySelectorAll(){return[];},
  getElementById(id){return id==='app'?app:id==='touch-controls'?touch:null;},
};
globalThis.window={addEventListener(){},AudioContext:null,webkitAudioContext:null};

const gradient={addColorStop(){}};
const ctx=new Proxy({
  canvas:null,
  measureText(value){return{width:String(value).length*9};},
  createLinearGradient(){return gradient;},
  createRadialGradient(){return gradient;},
  createPattern(){return{};},
  getImageData(){return{data:new Uint8ClampedArray(4)};},
}, {
  get(target,key){
    if(key in target)return target[key];
    if(typeof key==='symbol')return undefined;
    const fn=()=>{};target[key]=fn;return fn;
  },
  set(target,key,value){target[key]=value;return true;},
});
const canvas={
  width:1280,height:720,style:{},
  getContext(){ctx.canvas=this;return ctx;},
  addEventListener(){},focus(){},requestFullscreen(){},
  getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};},
};
const image={complete:true,naturalWidth:1600,naturalHeight:900};
const assets={
  keyArt:image,logo:image,heroSprites:image,enemySprites:image,objectSprites:image,
  collectibleSprites:image,tileSprites:image,vfxSprites:image,uiAtlas:image,
  comic1:image,comic2:image,comic3:image,comic4:image,comic5:image,
  backdrops:Array.from({length:10},()=>image),
};
const audio={enabled:true,play(){},setSong(){},toggle(){this.enabled=!this.enabled;return this.enabled;},unlock(){}};
const {Game}=await import('../src/game.js');
const game=new Game(canvas,audio,assets);
const now=performance.now();
const screens=['title','settings','help','credits','levelSelect'];
for(const screen of screens){game.setScreen(screen);game.render(now);}
for(let page=0;page<5;page++){game.comicPage=page;game.setScreen('comic');game.render(now);}
game.loadLevel(0);
for(const screen of ['playing','paused','victory','defeat']){game.setScreen(screen);game.render(now);}
game.loadLevel(9);game.setScreen('victory');game.nextLevel();
if(game.screen!=='chapterComplete'||game.completedChapter!==0)throw new Error('Chapter completion flow did not intercept the tenth room.');
game.render(now);game.continueAfterChapter();
if(game.levelIndex!==10||game.screen!=='playing')throw new Error('Chapter completion did not continue into the next world.');
game.loadLevel(99);game.setScreen('victory');game.nextLevel();
if(game.screen!=='complete')throw new Error('Final room did not open the ending screen.');
game.render(now);
if(app.dataset.screen!=='complete')throw new Error('DOM screen state was not synchronized.');
console.log('✓ Every shipping screen rendered against production asset interfaces without undefined symbols or missing state.');
