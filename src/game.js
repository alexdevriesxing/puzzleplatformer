import { CHAPTERS, LEVELS, COLS, ROWS, buildLevel } from './levels.js';
import { COLORS, drawBackdrop, drawTile, drawEntity, drawButton, drawLogo, drawComicPanel, drawHero, bindArtAssets, panel, text, shadowText, fittedText, divider, pill, statCard, rr, fillStroke } from './art.js';

const GRID_SIZE = 48;
const GRID_X = (1280 - COLS * GRID_SIZE) / 2;
const GRID_Y = 150;
const DIRS = {
  ArrowUp:[0,-1], w:[0,-1], W:[0,-1],
  ArrowDown:[0,1], s:[0,1], S:[0,1],
  ArrowLeft:[-1,0], a:[-1,0], A:[-1,0],
  ArrowRight:[1,0], d:[1,0], D:[1,0],
};
const SECRET_DEFINITIONS = [
  {id:'archive', label:'64K ARCHIVE', hint:'A famous ten-step code wakes an older machine.'},
  {id:'pip', label:'POCKET PIP', hint:'Sometimes a hero answers to his own name.'},
  {id:'lucky', label:'LUCKY SEVEN', hint:'The title prism enjoys patient visitors.'},
  {id:'room64', label:'ROOM 64K', hint:'Stillness can make old memory speak.'},
  {id:'null', label:'NULL MEMO', hint:'The credits hide a four-letter signature.'},
  {id:'master', label:'PERFECT LIGHT', hint:'Three stars in every room reveal the final spark.'},
];
const KONAMI_SEQUENCE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','B','A'];

const COMIC_COPY = [
  ['THE VAULT AWAKENS', 'For a thousand years, the Prism Vault kept every pocket world in perfect balance. Pip was its smallest—and proudest—Sparkkeeper.'],
  ['A LIGHT GOES OUT', 'Then the great Prism Heart vanished. The galleries twisted, the doors locked, and a laugh echoed through every brass pipe.'],
  ['BARON NULL', '“Order is terribly dull,” purred Baron Null. “Let us see how your little worlds manage without it.”'],
  ['ONE HUNDRED SHARDS', 'The Heart shattered into one hundred Prism Sparks, scattered through ten impossible wings of the Vault.'],
  ['SMALL HERO. BIG VAULT.', 'Pip tightened his scarf. Every machine has a pattern. Every puzzle has an answer. Time to bring the light home.'],
];

const storage = {
  get(key, fallback) { try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function ease(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
function dist(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }

export class Game {
  constructor(canvas, audio, assets={}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.assets = assets;
    bindArtAssets(assets);
    this.screen = 'title';
    this.previousScreen = 'title';
    this.level = null;
    this.levelIndex = 0;
    this.entities = [];
    this.grid = [];
    this.player = null;
    this.keys = 0;
    this.turns = 0;
    this.history = [];
    this.particles = [];
    this.beams = [];
    this.buttons = [];
    this.mouse = {x:-999,y:-999,down:false};
    this.hoverButton = null;
    this.focusIndex = 0;
    this.pointerMode = false;
    this.screenFade = 0;
    this.lastTime = performance.now();
    this.t = 0;
    this.busyUntil = 0;
    this.pendingScreen = null;
    this.bannerUntil = 0;
    this.toast = null;
    this.secretSequence = [];
    this.secretWord = '';
    this.titlePrismTaps = 0;
    this.lastTitlePrismTap = 0;
    this.levelLoadedAt = performance.now();
    this.room64SecretTriggered = false;
    this.shake = 0;
    this.flash = {alpha:0,color:'#fff'};
    this.comicPage = 0;
    this.levelSelectChapter = 0;
    this.completedChapter = 0;
    this.settings = {
      reducedMotion: storage.get('pip.motion', matchMedia('(prefers-reduced-motion: reduce)').matches),
      highContrast: storage.get('pip.contrast', false),
      archiveMode: storage.get('pip.archive', false),
    };
    this.progress = this.loadProgress();
    this.bindEvents();
    this.syncDomState();
    requestAnimationFrame(t => this.loop(t));
  }

  loadProgress() {
    try {
      const saved=storage.get('pip.progress', {});
      return { unlocked:1, stars:{}, best:{}, secrets:{}, introSeen:false, ...saved, secrets:{...(saved.secrets??{})} };
    } catch { return {unlocked:1, stars:{}, best:{}, secrets:{}, introSeen:false}; }
  }
  saveProgress(){ storage.set('pip.progress', this.progress); }

  bindEvents() {
    window.addEventListener('keydown', e => {
      const used = this.handleKey(e.key, { shift: e.shiftKey });
      if (used) e.preventDefault();
      this.audio.unlock();
    }, {passive:false});
    this.canvas.addEventListener('pointermove', e => { this.pointerMode=true; this.updatePointer(e); });
    this.canvas.addEventListener('pointerdown', e => { this.pointerMode=true; this.updatePointer(e); this.mouse.down=true; this.audio.unlock(); });
    window.addEventListener('pointerup', e => { if (this.mouse.down) { this.updatePointer(e); this.handleClick(); } this.mouse.down=false; });
    document.querySelectorAll('[data-key]').forEach(btn => {
      let delayId = 0;
      let repeatId = 0;
      const fire = () => {
        this.audio.unlock();
        this.handleKey(btn.dataset.key);
        navigator.vibrate?.(8);
      };
      const stop = () => {
        clearTimeout(delayId);
        clearInterval(repeatId);
        delayId = 0;
        repeatId = 0;
      };
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        fire();
        if (btn.dataset.key.startsWith('Arrow')) {
          delayId = setTimeout(() => { repeatId = setInterval(fire, 105); }, 240);
        }
      });
      for (const eventName of ['pointerup','pointercancel','pointerleave','lostpointercapture']) btn.addEventListener(eventName, stop);
    });
    window.addEventListener('blur', () => { if(this.screen==='playing') this.setScreen('paused'); });
    document.addEventListener('visibilitychange', () => { if(document.hidden&&this.screen==='playing') this.setScreen('paused'); });
  }

  updatePointer(e) {
    const r=this.canvas.getBoundingClientRect();
    this.mouse.x=(e.clientX-r.left)*this.canvas.width/r.width;
    this.mouse.y=(e.clientY-r.top)*this.canvas.height/r.height;
    const index=this.buttons.findIndex(b=>this.mouse.x>=b.x&&this.mouse.x<=b.x+b.w&&this.mouse.y>=b.y&&this.mouse.y<=b.y+b.h);
    if(index>=0)this.focusIndex=index;
  }

  syncDomState() {
    const app=document.getElementById?.('app');
    if(app){ app.dataset.screen=this.screen; app.dataset.archive=this.settings.archiveMode?'true':'false'; }
    const controls=document.getElementById?.('touch-controls');
    if(controls){
      const active=this.screen==='playing';
      controls.setAttribute('aria-hidden',active?'false':'true');
      controls.inert=!active;
    }
    const labels={title:'Title menu',comic:'Story comic',playing:'Puzzle room',paused:'Pause menu',victory:'Room-cleared results',defeat:'Defeat menu',levelSelect:'Level directory',settings:'Options menu',help:'How-to-play guide',credits:'Credits',chapterComplete:'Chapter-complete results',complete:'Final ending'};
    const detail=this.screen==='playing'&&this.level?` Room ${this.level.number}: ${this.level.name}.`:'';
    this.canvas.setAttribute?.('aria-label',`Pip and the Prism Vault — ${labels[this.screen]??this.screen}.${detail}`);
  }

  setScreen(name) {
    if (name === this.screen) return;
    this.previousScreen = this.screen;
    this.screen = name;
    this.buttons = [];
    this.focusIndex = name==='levelSelect' ? 2 : 0;
    this.pointerMode = false;
    this.screenFade = this.settings.reducedMotion ? 0 : 1;
    this.syncDomState();
  }

  moveMenuFocus(delta) {
    if (!this.buttons.length) return false;
    this.pointerMode = false;
    let next=this.focusIndex;
    for(let i=0;i<this.buttons.length;i++){
      next=(next+delta+this.buttons.length)%this.buttons.length;
      if(!this.buttons[next]?.disabled)break;
    }
    this.focusIndex=next;
    this.audio.play('ui');
    return true;
  }

  activateFocusedButton() {
    const button = this.buttons[this.focusIndex];
    if (!button || button.disabled) return false;
    this.audio.play('ui');
    button.action();
    return true;
  }


  secretCount(){ return SECRET_DEFINITIONS.filter(secret=>this.progress.secrets?.[secret.id]).length; }

  unlockSecret(id,message,{toggleArchive=false,burst=null}={}) {
    const known=!!this.progress.secrets?.[id];
    this.progress.secrets={...(this.progress.secrets??{}),[id]:true};
    if(toggleArchive){
      this.settings.archiveMode=!this.settings.archiveMode;
      storage.set('pip.archive',this.settings.archiveMode);
      this.syncDomState();
    }
    this.saveProgress();
    if(burst)this.spawnScreenBurst(burst.x,burst.y,burst.color??'#b68cff',burst.count??28);
    this.audio.play('secret');
    const prefix=known?'SECRET RECALLED':'VAULT SECRET DISCOVERED';
    this.showToast(`${prefix} — ${message}`,4.2);
    return !known;
  }

  trackSecretInput(key) {
    if(!['title','credits','complete'].includes(this.screen))return false;
    const token=key.length===1?key.toUpperCase():key;
    this.secretSequence.push(token);
    if(this.secretSequence.length>KONAMI_SEQUENCE.length)this.secretSequence.shift();
    if(this.screen==='title'&&this.secretSequence.join('|')===KONAMI_SEQUENCE.join('|')){
      this.secretSequence=[];
      const state=this.settings.archiveMode?'ARCHIVE DISPLAY OFFLINE':'64K ARCHIVE DISPLAY ONLINE';
      this.unlockSecret('archive',state,{toggleArchive:true,burst:{x:340,y:160,color:'#77d8ff',count:36}});
      return true;
    }
    if(key.length===1&&/[a-z0-9]/i.test(key)){
      this.secretWord=(this.secretWord+key.toUpperCase()).slice(-12);
      if(this.screen==='title'&&this.secretWord.endsWith('PIP')){
        this.secretWord='';
        this.unlockSecret('pip','POCKET WORLDS FOREVER',{burst:{x:910,y:268,color:'#d98cff',count:44}});
        return true;
      }
      if(this.screen==='title'&&this.secretWord.endsWith('C64')){
        this.secretWord='';
        const state=this.settings.archiveMode?'ARCHIVE DISPLAY OFFLINE':'64K ARCHIVE DISPLAY ONLINE';
        this.unlockSecret('archive',state,{toggleArchive:true,burst:{x:340,y:160,color:'#77d8ff',count:36}});
        return true;
      }
      if(['credits','complete'].includes(this.screen)&&this.secretWord.endsWith('NULL')){
        this.secretWord='';
        this.unlockSecret('null','MEMO 0: ORDER IS TERRIBLY OVERRATED',{burst:{x:640,y:350,color:'#a874ff',count:34}});
        return true;
      }
    }
    return false;
  }

  checkMasterSecret(){
    const total=Object.values(this.progress.stars).reduce((sum,value)=>sum+value,0);
    if(total>=300&&!this.progress.secrets?.master){
      this.unlockSecret('master','PERFECT LIGHT — EVERY ROOM MASTERED',{burst:{x:640,y:300,color:'#fff27a',count:64}});
    }
  }

  spawnScreenBurst(x,y,color,count=24){
    if(this.settings.reducedMotion)count=Math.min(count,6);
    for(let i=0;i<count;i++){
      const angle=Math.random()*Math.PI*2,speed=42+Math.random()*150;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-28,life:.5+Math.random()*.8,max:1,size:2+Math.random()*6,color,shape:i%8});
    }
  }

  handleKey(key, meta={}) {
    const secretTriggered=this.trackSecretInput(key);
    if(secretTriggered)return true;
    if (key === 'm' || key === 'M') { const on=this.audio.toggle(); this.showToast(on?'SOUND ON':'SOUND OFF'); return true; }
    if (key === 'f' || key === 'F') { this.toggleFullscreen(); return true; }
    const menuScreen = !['playing'].includes(this.screen);
    if (menuScreen && key === 'Tab') return this.moveMenuFocus(meta.shift ? -1 : 1);
    if (menuScreen && ['ArrowDown','s','S'].includes(key) && this.screen !== 'comic') return this.moveMenuFocus(1);
    if (menuScreen && ['ArrowUp','w','W'].includes(key) && this.screen !== 'comic') return this.moveMenuFocus(-1);
    if (menuScreen && (key === 'Enter' || key === ' ') && this.activateFocusedButton()) return true;
    if (this.screen === 'title') {
      if (key==='Enter'||key===' ') { this.startCampaign(); return true; }
      if (key==='l'||key==='L') { this.setScreen('levelSelect'); return true; }
      return false;
    }
    if (this.screen === 'comic') {
      if (['Enter',' ','ArrowRight'].includes(key)) { this.advanceComic(); return true; }
      if (key==='ArrowLeft') { this.comicPage=Math.max(0,this.comicPage-1); this.audio.play('ui'); return true; }
      if (key==='Escape') { this.setScreen('title'); return true; }
      return false;
    }
    if (this.screen === 'playing') {
      if (DIRS[key]) { const [dx,dy]=DIRS[key]; this.attemptMove(dx,dy); return true; }
      if (key==='z'||key==='Z'||key==='Backspace') { this.undo(); return true; }
      if (key==='r'||key==='R') { this.restartLevel(); return true; }
      if (key==='Escape'||key==='p'||key==='P') { this.setScreen('paused'); this.audio.play('ui'); return true; }
      if (key==='h'||key==='H') { this.showToast(this.level.hint, 4); return true; }
      return false;
    }
    if (this.screen === 'paused') {
      if (key==='Escape'||key==='p'||key==='P'||key==='Enter') { this.setScreen('playing'); this.audio.play('ui'); return true; }
      if (key==='r'||key==='R') { this.restartLevel(); return true; }
      return false;
    }
    if (this.screen === 'victory') {
      if (key==='Enter'||key===' '||key==='ArrowRight') { this.nextLevel(); return true; }
      if (key==='r'||key==='R') { this.restartLevel(); return true; }
      if (key==='Escape') { this.setScreen('levelSelect'); return true; }
      return false;
    }
    if (this.screen === 'defeat') {
      if (key==='r'||key==='R'||key==='Enter') { this.restartLevel(); return true; }
      if (key==='z'||key==='Z'||key==='Backspace') { this.setScreen('playing'); this.undo(); return true; }
      if (key==='Escape') { this.setScreen('levelSelect'); return true; }
      return false;
    }
    if (this.screen === 'levelSelect') {
      if (key==='Escape') { this.setScreen('title'); return true; }
      if (key==='ArrowLeft') { this.levelSelectChapter=(this.levelSelectChapter+9)%10; this.audio.play('ui'); return true; }
      if (key==='ArrowRight') { this.levelSelectChapter=(this.levelSelectChapter+1)%10; this.audio.play('ui'); return true; }
      return false;
    }
    if (this.screen === 'settings' || this.screen === 'help' || this.screen === 'credits') {
      if (key==='Escape') { this.setScreen(this.previousScreen===this.screen?'title':this.previousScreen); return true; }
      return false;
    }
    if (this.screen === 'chapterComplete') {
      if (key==='Enter'||key===' '||key==='ArrowRight') { this.continueAfterChapter(); return true; }
      if (key==='Escape') { this.setScreen('levelSelect'); return true; }
      return false;
    }
    if (this.screen === 'complete') {
      if (key==='Enter'||key==='Escape') { this.setScreen('title'); return true; }
    }
    return false;
  }

  toggleFullscreen(){
    const target=document.getElementById('app')??this.canvas;
    if (!document.fullscreenElement) target.requestFullscreen?.(); else document.exitFullscreen?.();
  }

  startCampaign() {
    this.audio.play('start');
    if (!this.progress.introSeen) { this.comicPage=0; this.setScreen('comic'); }
    else this.loadLevel(clamp(this.progress.unlocked-1,0,99));
  }

  advanceComic() {
    this.audio.play('ui');
    if (this.comicPage < COMIC_COPY.length-1) this.comicPage++;
    else { this.progress.introSeen=true; this.saveProgress(); this.loadLevel(clamp(this.progress.unlocked-1,0,99)); }
  }

  loadLevel(index) {
    this.levelIndex=clamp(index,0,99);
    this.level=buildLevel(this.levelIndex);
    this.grid=deepClone(this.level.grid);
    this.entities=deepClone(this.level.entities).map((e,i)=>({...e,id:`e${i}-${Date.now()}`,dirVec:{x:e.dir||1,y:0},motion:null,mood:'ready'}));
    this.player=this.entities.find(e=>e.kind==='player');
    this.keys=0;this.turns=0;this.history=[];this.particles=[];this.beams=[];this.pendingScreen=null;
    this.levelLoadedAt=performance.now();this.room64SecretTriggered=false;
    this.audio.setSong(this.level.theme.music);
    this.setScreen('playing');
    this.bannerUntil=performance.now()+2600;
    this.flash={alpha:.45,color:this.level.theme.accent};
    this.spawnBurst(this.player.x,this.player.y,this.level.theme.accent,18);
  }

  restartLevel() { this.audio.play('ui'); this.loadLevel(this.levelIndex); }

  nextLevel() {
    this.audio.play('ui');
    if (this.levelIndex >= 99) { this.setScreen('complete'); this.audio.setSong('finale'); return; }
    if ((this.levelIndex+1)%10===0) {
      this.completedChapter=this.level.chapter;
      this.setScreen('chapterComplete');
      return;
    }
    this.loadLevel(this.levelIndex+1);
  }

  continueAfterChapter() {
    this.audio.play('start');
    this.loadLevel(Math.min(99,(this.completedChapter+1)*10));
  }

  snapshot() {
    return {
      grid:deepClone(this.grid),
      entities:deepClone(this.entities.map(({motion,_path,_turnStart,...e})=>e)),
      keys:this.keys,
      turns:this.turns,
    };
  }

  restore(s) {
    this.grid=deepClone(s.grid);
    this.entities=deepClone(s.entities).map(e=>({...e,motion:null,_path:[],_turnStart:[e.x,e.y]}));
    this.player=this.entities.find(e=>e.kind==='player');
    this.keys=s.keys;this.turns=s.turns;this.pendingScreen=null;this.busyUntil=0;this.beams=[];
    this.spawnBurst(this.player.x,this.player.y,'#60e6ff',10);
  }

  undo() {
    if (!this.history.length || performance.now()<this.busyUntil) { this.audio.play('bump'); return; }
    this.restore(this.history.pop());
    this.audio.play('undo');
    this.showToast('TURN REWOUND');
  }

  entityAt(x,y,filter=null) {
    return this.entities.find(e=>e.x===x&&e.y===y&&(!filter||filter(e)));
  }
  entitiesAt(x,y){ return this.entities.filter(e=>e.x===x&&e.y===y); }
  tileAt(x,y){ return this.grid[y]?.[x] ?? 'wall'; }
  isGateOpen(){ return this.entities.some(p=>p.kind==='plate'&&this.entities.some(e=>['crate','player'].includes(e.kind)&&e.x===p.x&&e.y===p.y)); }
  remainingShards(){ return this.entities.filter(e=>e.kind==='shard').length; }

  terrainBlocked(x,y,e,ghost=false) {
    if (x<=0||y<=0||x>=COLS-1||y>=ROWS-1) return true;
    const tile=this.tileAt(x,y);
    if (!ghost && (tile==='wall'||tile==='broken')) return true;
    const gateOpen=this.isGateOpen();
    const blocker=this.entitiesAt(x,y).find(o=>{
      if(o===e) return false;
      if(o.kind==='door'||o.kind==='crate') return true;
      if(o.kind==='gate'&&!gateOpen) return true;
      if(o.kind==='enemy'&&e.kind==='enemy') return true;
      return false;
    });
    return !!blocker;
  }

  beginTurn() {
    this.entities.forEach(e=>{e._turnStart=[e.x,e.y];e._path=[];});
  }
  moveEntity(e,x,y) { e.x=x;e.y=y;e._path.push([x,y]); }
  removeEntity(e) { const i=this.entities.indexOf(e); if(i>=0)this.entities.splice(i,1); }

  attemptMove(dx,dy) {
    const now=performance.now();
    if (now<this.busyUntil||this.pendingScreen) return;
    const before=this.snapshot();
    this.beginTurn();
    const moved=this.movePlayer(dx,dy);
    if (!moved) { this.audio.play('bump'); this.shake=Math.max(this.shake,2); return; }
    this.history.push(before); if(this.history.length>80)this.history.shift();
    this.player.dirVec={x:dx,y:dy};
    this.audio.play('move');
    this.resolvePlayerTile(dx,dy,0);
    this.collectAtPlayer();
    this.moveEnemies();
    this.turns++;
    this.checkTurrets();
    this.checkDanger();
    this.checkExit();
    this.finalizeTurnAnimation();
  }


  leavePlayerTile(x,y) {
    if(this.tileAt(x,y)!=='fragile')return;
    this.grid[y][x]='broken';
    this.spawnBurst(x,y,'#ffe3ab',9);
    this.audio.play('crack');
  }

  movePlayer(dx,dy) {
    const nx=this.player.x+dx,ny=this.player.y+dy;
    if(this.tileAt(nx,ny)==='wall'||this.tileAt(nx,ny)==='broken') return false;
    const gate=this.entityAt(nx,ny,e=>e.kind==='gate');
    if(gate&&!this.isGateOpen()) return false;
    const door=this.entityAt(nx,ny,e=>e.kind==='door');
    if(door){
      if(this.keys<=0)return false;
      this.keys--;this.removeEntity(door);this.audio.play('door');this.spawnBurst(nx,ny,'#ffd35a',12);
    }
    const crate=this.entityAt(nx,ny,e=>e.kind==='crate');
    if(crate){
      const bx=nx+dx,by=ny+dy;
      if(this.terrainBlocked(bx,by,crate)||this.entityAt(bx,by,e=>['shard','key','exit','plate','gate','door','enemy','crate'].includes(e.kind)&&e.kind!=='plate'))return false;
      this.moveEntity(crate,bx,by);this.audio.play('push');this.spawnBurst(bx,by,'#d89a55',5);
    }
    const enemy=this.entityAt(nx,ny,e=>e.kind==='enemy');
    this.leavePlayerTile(this.player.x,this.player.y);
    this.moveEntity(this.player,nx,ny);
    if(enemy)this.triggerDefeat('Pip stepped into a guard patrol.');
    return true;
  }

  resolvePlayerTile(dx,dy,depth) {
    if(depth>18)return;
    const kind=this.tileAt(this.player.x,this.player.y);
    if(kind==='teleportA'||kind==='teleportB'){
      const targetKind=kind==='teleportA'?'teleportB':'teleportA';
      outer:for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(this.grid[y][x]===targetKind){
        if(!this.terrainBlocked(x,y,this.player)){
          this.leavePlayerTile(this.player.x,this.player.y);
          this.moveEntity(this.player,x,y);
          this.collectAtPlayer();
          this.audio.play('teleport');
          this.spawnBurst(x,y,kind==='teleportA'?'#d886ff':'#60e6ff',16);
        }
        break outer;
      }
      return;
    }
    let auto=null;
    if(kind==='ice')auto=[dx,dy];
    if(kind==='conveyorRight')auto=[1,0];
    if(kind==='conveyorLeft')auto=[-1,0];
    if(kind==='conveyorUp')auto=[0,-1];
    if(kind==='conveyorDown')auto=[0,1];
    if(auto){
      const [ax,ay]=auto;const nx=this.player.x+ax,ny=this.player.y+ay;
      if(!this.terrainBlocked(nx,ny,this.player)&&!this.entityAt(nx,ny,e=>e.kind==='enemy')){
        const crate=this.entityAt(nx,ny,e=>e.kind==='crate');
        if(!crate){
          this.leavePlayerTile(this.player.x,this.player.y);
          this.moveEntity(this.player,nx,ny);
          this.collectAtPlayer();
          this.resolvePlayerTile(ax,ay,depth+1);
        }
      }
    }
  }

  collectAtPlayer() {
    for(const e of [...this.entitiesAt(this.player.x,this.player.y)]){
      if(e.kind==='shard'){
        this.removeEntity(e);this.audio.play('shard');this.spawnBurst(e.x,e.y,this.level.theme.accent,22);this.flash={alpha:.18,color:'#fff'};
      } else if(e.kind==='key'){
        this.removeEntity(e);this.keys++;this.audio.play('key');this.spawnBurst(e.x,e.y,'#ffe071',14);
      }
    }
  }

  enemyCanEnter(e,x,y,ghost=false) {
    if(this.terrainBlocked(x,y,e,ghost))return false;
    return !this.entitiesAt(x,y).some(o=>o!==e&&['enemy','crate','door'].includes(o.kind));
  }

  chaseStep(e,ghost=false) {
    const dx=Math.sign(this.player.x-e.x),dy=Math.sign(this.player.y-e.y);
    const options=Math.abs(this.player.x-e.x)>=Math.abs(this.player.y-e.y)?[[dx,0],[0,dy]]:[[0,dy],[dx,0]];
    for(const [mx,my] of options){ if((mx||my)&&this.enemyCanEnter(e,e.x+mx,e.y+my,ghost)){this.moveEntity(e,e.x+mx,e.y+my);return true;} }
    return false;
  }

  moveEnemies() {
    const turn=this.turns+1;
    for(const e of this.entities.filter(e=>e.kind==='enemy')){
      if(this.pendingScreen)break;
      if(e.type==='turret')continue;
      if(e.type==='scarab'){
        let nx=e.x+(e.dir||1);if(!this.enemyCanEnter(e,nx,e.y)){e.dir=-(e.dir||1);nx=e.x+e.dir;}if(this.enemyCanEnter(e,nx,e.y))this.moveEntity(e,nx,e.y);
      } else if(e.type==='crawler'){
        let ny=e.y+(e.dir||1);if(!this.enemyCanEnter(e,e.x,ny)){e.dir=-(e.dir||1);ny=e.y+e.dir;}if(this.enemyCanEnter(e,e.x,ny))this.moveEntity(e,e.x,ny);
      } else if(e.type==='slime'){
        if((turn+e.phase)%2===0)this.chaseStep(e);
      } else if(e.type==='hopper'){
        if((turn+e.phase)%2===0){for(let i=0;i<2;i++){let nx=e.x+(e.dir||1);if(!this.enemyCanEnter(e,nx,e.y)){e.dir=-(e.dir||1);nx=e.x+e.dir;}if(this.enemyCanEnter(e,nx,e.y))this.moveEntity(e,nx,e.y);}}
      } else if(e.type==='ghost'){
        if((turn+e.phase)%2===0)this.chaseStep(e,true);
      } else if(e.type==='mimic'){
        if(dist(e,this.player)<=5)this.chaseStep(e);
      } else if(e.type==='drone'){
        const dirs=[[1,0],[0,1],[-1,0],[0,-1]];let d=(e.phase+turn)%4;for(let i=0;i<4;i++){const [mx,my]=dirs[(d+i)%4];if(this.enemyCanEnter(e,e.x+mx,e.y+my)){this.moveEntity(e,e.x+mx,e.y+my);e.phase=(d+i)%4;break;}}
      }
      if(e.x===this.player.x&&e.y===this.player.y)this.triggerDefeat('A Vault guard caught Pip.');
    }
  }

  clearLine(x1,y1,x2,y2) {
    const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);let x=x1+dx,y=y1+dy;
    while(x!==x2||y!==y2){
      if(this.tileAt(x,y)==='wall'||this.tileAt(x,y)==='broken')return false;
      if(this.entitiesAt(x,y).some(e=>e.kind==='crate'||e.kind==='door'||(e.kind==='gate'&&!this.isGateOpen())))return false;
      x+=dx;y+=dy;
    }
    return true;
  }

  checkTurrets() {
    for(const e of this.entities.filter(e=>e.kind==='enemy'&&e.type==='turret')){
      if((this.turns+e.phase)%3!==0)continue;
      let hit=false,ex=e.x,ey=e.y;
      if(e.x===this.player.x&&this.clearLine(e.x,e.y,this.player.x,this.player.y)){hit=true;ey=this.player.y;}
      else if(e.y===this.player.y&&this.clearLine(e.x,e.y,this.player.x,this.player.y)){hit=true;ex=this.player.x;}
      else {
        // Fire to the nearest wall for readable cadence even when it misses.
        const horizontal=(this.turns+e.phase)%2===0,sign=e.dir||1;let x=e.x,y=e.y;
        while(true){const nx=x+(horizontal?sign:0),ny=y+(horizontal?0:sign);if(this.tileAt(nx,ny)==='wall')break;x=nx;y=ny;}ex=x;ey=y;
      }
      this.beams.push({x1:e.x,y1:e.y,x2:ex,y2:ey,born:performance.now(),life:320});
      this.audio.play('laser');this.flash={alpha:.08,color:'#ff6d7a'};
      if(hit)this.triggerDefeat('A sentry beam crossed Pip’s path.');
    }
  }

  checkDanger() {
    const tile=this.tileAt(this.player.x,this.player.y);
    if(['hazard','spikes','broken'].includes(tile))this.triggerDefeat(tile==='spikes'?'Pip found the pointy part of the plan.':'The floor was not as friendly as it looked.');
    if(this.entities.some(e=>e.kind==='enemy'&&e.x===this.player.x&&e.y===this.player.y))this.triggerDefeat('A Vault guard caught Pip.');
  }

  checkExit() {
    const exit=this.entityAt(this.player.x,this.player.y,e=>e.kind==='exit');
    if(exit&&this.remainingShards()===0&&!this.pendingScreen)this.triggerVictory();
  }

  triggerDefeat(reason) {
    if(this.pendingScreen)return;
    this.pendingScreen='defeat';this.defeatReason=reason;this.player.mood='defeat';this.audio.play('hit');this.shake=this.settings.reducedMotion?2:14;this.flash={alpha:.5,color:'#ff334d'};
    this.spawnBurst(this.player.x,this.player.y,'#ff6d7a',28);
  }

  triggerVictory() {
    if(this.pendingScreen)return;
    this.pendingScreen='victory';
    const ratio=this.turns/this.level.par;
    this.victoryStars=ratio<=1?3:ratio<=1.35?2:1;
    const key=String(this.levelIndex);
    this.progress.unlocked=Math.max(this.progress.unlocked,Math.min(100,this.levelIndex+2));
    this.progress.stars[key]=Math.max(this.progress.stars[key]||0,this.victoryStars);
    this.progress.best[key]=Math.min(this.progress.best[key]||9999,this.turns);
    this.saveProgress();
    this.checkMasterSecret();
    this.audio.play('victory');this.flash={alpha:.55,color:'#fff27a'};this.spawnBurst(this.player.x,this.player.y,this.level.theme.accent,46);
  }

  finalizeTurnAnimation() {
    const now=performance.now();let max=0;
    for(const e of this.entities){
      if(e._path?.length){const points=[e._turnStart,...e._path];const duration=(this.settings.reducedMotion?35:95)*(points.length-1);e.motion={points,start:now,duration:Math.max(35,duration)};max=Math.max(max,e.motion.duration);}
      delete e._path;delete e._turnStart;
    }
    this.busyUntil=now+max+70;
  }

  displayPosition(e,now) {
    const m=e.motion;if(!m||now>=m.start+m.duration){e.motion=null;return{x:e.x,y:e.y};}
    const p=clamp((now-m.start)/m.duration,0,1)*(m.points.length-1);const i=Math.floor(p);const f=ease(p-i);const a=m.points[i],b=m.points[Math.min(i+1,m.points.length-1)];
    return{x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f};
  }

  spawnBurst(gx,gy,color,count=12) {
    if (this.settings.reducedMotion) count=Math.min(count,4);
    const x=GRID_X+(gx+.5)*GRID_SIZE,y=GRID_Y+(gy+.5)*GRID_SIZE;
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=(this.settings.reducedMotion?18:35)+Math.random()*(this.settings.reducedMotion?28:125);this.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-20,life:.35+Math.random()*.65,max:1,size:2+Math.random()*5,color,shape:i%8});}
  }

  showToast(message,duration=2) { this.toast={message,until:performance.now()+duration*1000}; }

  update(dt,now) {
    this.t+=dt;
    if(this.pendingScreen&&now>=this.busyUntil){this.setScreen(this.pendingScreen);this.pendingScreen=null;if(this.screen==='defeat')this.audio.play('defeat');}
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.vx*=.985;}
    this.particles=this.particles.filter(p=>p.life>0);
    this.beams=this.beams.filter(b=>now-b.born<b.life);
    this.shake*=Math.pow(.02,dt);
    this.flash.alpha*=Math.pow(.015,dt);
    if(this.toast&&now>this.toast.until)this.toast=null;
    if(this.screen==='playing'&&this.levelIndex===63&&this.turns===0&&!this.room64SecretTriggered&&now-this.levelLoadedAt>=6400){
      this.room64SecretTriggered=true;
      this.unlockSecret('room64','64K OF COURAGE — THE OLD VAULT REMEMBERS',{burst:{x:GRID_X+(this.player.x+.5)*GRID_SIZE,y:GRID_Y+(this.player.y+.5)*GRID_SIZE,color:'#77d8ff',count:32}});
    }
    this.screenFade=Math.max(0,this.screenFade-dt*3.8);
  }

  loop(now) {
    const dt=Math.min(.034,(now-this.lastTime)/1000);this.lastTime=now;this.update(dt,now);this.render(now);requestAnimationFrame(t=>this.loop(t));
  }

  render(now) {
    const storedTime=this.t;
    if(this.settings.reducedMotion)this.t=0;
    const ctx=this.ctx;ctx.save();ctx.filter=this.settings.highContrast?'contrast(1.2) saturate(1.08) brightness(1.04)':'none';
    const sx=this.settings.reducedMotion?0:(Math.random()-.5)*this.shake,sy=this.settings.reducedMotion?0:(Math.random()-.5)*this.shake;ctx.translate(sx,sy);
    this.buttons=[];
    if(this.screen==='title')this.renderTitle(now);
    else if(this.screen==='comic')this.renderComic(now);
    else if(['playing','paused','victory','defeat'].includes(this.screen)){this.renderGame(now);if(this.screen==='paused')this.renderPause();if(this.screen==='victory')this.renderVictory();if(this.screen==='defeat')this.renderDefeat();}
    else if(this.screen==='levelSelect')this.renderLevelSelect(now);
    else if(this.screen==='settings')this.renderSettings(now);
    else if(this.screen==='help')this.renderHelp(now);
    else if(this.screen==='credits')this.renderCredits(now);
    else if(this.screen==='chapterComplete')this.renderChapterComplete(now);
    else if(this.screen==='complete')this.renderComplete(now);
    if(!['playing','paused','victory','defeat'].includes(this.screen))this.renderParticles();
    if(this.flash.alpha>.005){ctx.globalAlpha=this.flash.alpha;ctx.fillStyle=this.flash.color;ctx.fillRect(-20,-20,1320,760);ctx.globalAlpha=1;}
    this.renderToast();
    if(this.settings.archiveMode)this.renderArchiveOverlay();
    if(this.screenFade>.005){ctx.globalAlpha=this.screenFade;ctx.fillStyle='#050817';ctx.fillRect(-20,-20,1320,760);ctx.globalAlpha=1;}
    ctx.restore();
    this.t=storedTime;
    if(this.buttons.length)this.focusIndex=clamp(this.focusIndex,0,this.buttons.length-1);else this.focusIndex=0;
    this.hoverButton=this.buttons.find(b=>this.mouse.x>=b.x&&this.mouse.x<=b.x+b.w&&this.mouse.y>=b.y&&this.mouse.y<=b.y+b.h)||null;
    this.canvas.style.cursor=this.hoverButton?'pointer':'default';
  }

  addButton(x,y,w,h,label,action,opts={}) {
    const index=this.buttons.length;
    const b={x,y,w,h,label,action,focused:index===this.focusIndex,...opts};
    this.buttons.push(b);
    const hover=this.mouse.x>=x&&this.mouse.x<=x+w&&this.mouse.y>=y&&this.mouse.y<=y+h;
    const pressed=this.mouse.down&&hover;
    drawButton(this.ctx,b,hover||b.focused,pressed);
    return b;
  }

  handleClick() {
    const index=this.buttons.findIndex(b=>this.mouse.x>=b.x&&this.mouse.x<=b.x+b.w&&this.mouse.y>=b.y&&this.mouse.y<=b.y+b.h);
    const b=this.buttons[index];
    if(b&&!b.disabled){this.focusIndex=index;this.audio.play('ui');b.action();return;}
    if(this.screen==='title'&&this.mouse.x>=92&&this.mouse.x<=586&&this.mouse.y>=72&&this.mouse.y<=245){
      const now=performance.now();
      if(now-this.lastTitlePrismTap>2200)this.titlePrismTaps=0;
      this.lastTitlePrismTap=now;this.titlePrismTaps++;this.audio.play('ui');
      this.spawnScreenBurst(this.mouse.x,this.mouse.y,'#d98cff',4);
      if(this.titlePrismTaps>=7){this.titlePrismTaps=0;this.unlockSecret('lucky','THE SEVENTH PRISM WINKS BACK',{burst:{x:340,y:154,color:'#fff27a',count:48}});}
    }
  }

  featureSummary(level=this.level) {
    const labels={key:'ONE-USE LOCK',crate:'PUSH WEIGHT',gate:'POWER GATE',ice:'ICE MOMENTUM',conveyor:'FORCED MOTION',teleport:'PAIRED COILS',fragile:'COLLAPSING FLOOR',hazard:'LETHAL TERRAIN',spikes:'SPIKE FIELD'};
    return (level?.features??[]).map(feature=>labels[feature]??feature.toUpperCase()).join('  •  ') || 'ROUTE READING  •  PATROL TIMING';
  }

  drawProgressBar(x,y,w,h,value,max,color,label='',detail='') {
    const ctx=this.ctx,ratio=max>0?clamp(value/max,0,1):0;
    ctx.save();rr(ctx,x,y,w,h,h/2);ctx.fillStyle='rgba(2,7,24,.72)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1.5;ctx.stroke();
    if(ratio>0){rr(ctx,x+2,y+2,Math.max(h-4,(w-4)*ratio),h-4,(h-4)/2);const g=ctx.createLinearGradient(x,y,x+w,y);g.addColorStop(0,color);g.addColorStop(1,'#ffffff');ctx.fillStyle=g;ctx.globalAlpha=.9;ctx.fill();}
    ctx.globalAlpha=1;if(label)text(ctx,label,x,y-10,10,'rgba(255,255,255,.58)','left',900);if(detail)text(ctx,detail,x+w,y-10,10,color,'right',900);ctx.restore();
  }

  drawHudToken(x,y,w,icon,value,color,label,detail='') {
    const ctx=this.ctx;ctx.save();rr(ctx,x,y,w,50,15);ctx.fillStyle='rgba(7,12,33,.76)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=`${color}22`;ctx.beginPath();ctx.arc(x+25,y+25,18,0,Math.PI*2);ctx.fill();shadowText(ctx,icon,x+25,y+24,20,color);
    text(ctx,String(value),x+52,y+20,20,'#fff4cf','left',1000);text(ctx,label,x+52,y+37,9,'rgba(255,255,255,.57)','left',900);if(detail)text(ctx,detail,x+w-10,y+37,9,color,'right',900);ctx.restore();
  }

  drawStars(x,y,count,spacing=66,outer=27,inner=12) {
    const ctx=this.ctx;for(let i=0;i<3;i++){const active=i<count;ctx.save();ctx.translate(x+i*spacing,y);ctx.rotate(this.settings.reducedMotion?0:Math.sin(this.t*2+i)*.035);ctx.shadowColor=active?'#ffd35a':'transparent';ctx.shadowBlur=active?14:0;ctx.fillStyle=active?'#ffd35a':'#303751';ctx.strokeStyle=active?'#fff1aa':'#5d6684';ctx.lineWidth=3;this.starPath(ctx,0,0,outer,inner);ctx.fill();ctx.stroke();ctx.restore();}
  }

  renderTitle(now) {
    const ctx=this.ctx,theme=CHAPTERS[9];drawBackdrop(ctx,theme,this.t,'title');
    ctx.save();ctx.globalAlpha=.95;ctx.drawImage(this.assets.keyArt,560,0,1040,900,598,0,682,720);const fade=ctx.createLinearGradient(570,0,840,0);fade.addColorStop(0,'rgba(9,12,34,1)');fade.addColorStop(1,'rgba(9,12,34,0)');ctx.fillStyle=fade;ctx.fillRect(560,0,330,720);ctx.restore();
    const shade=ctx.createLinearGradient(0,0,720,0);shade.addColorStop(0,'rgba(7,10,29,.97)');shade.addColorStop(.72,'rgba(7,10,29,.72)');shade.addColorStop(1,'rgba(7,10,29,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,760,720);
    pill(ctx,118,42,302,30,'PIP’S POCKET WORLDS  •  ENTRY ONE',theme.accent,{size:11});
    drawLogo(ctx,340,161,.86);
    text(ctx,'A handcrafted puzzle arcade adventure',340,254,19,'#d9e9ff','center',750);
    pill(ctx,196,280,288,30,'100 AUTHORED ROOMS  •  10 WORLDS','#ffd35a',{size:11,fill:'rgba(67,42,13,.72)'});
    const label=this.progress.unlocked>1?'CONTINUE CAMPAIGN':'BEGIN ADVENTURE';
    this.addButton(118,326,444,66,label,()=>this.startCampaign(),{size:23,fill:'#8c62dc',fill2:'#48378f',accent:'#d8b7ff'});
    this.addButton(118,408,214,52,'LEVEL DIRECTORY',()=>this.setScreen('levelSelect'),{size:16,fill:'#4568aa',fill2:'#273c73'});
    this.addButton(348,408,214,52,'OPTIONS',()=>this.setScreen('settings'),{size:18,fill:'#4568aa',fill2:'#273c73'});
    this.addButton(118,474,214,48,'HOW TO PLAY',()=>this.setScreen('help'),{size:15,fill:'#3a567f',fill2:'#253555'});
    this.addButton(348,474,214,48,'STORY COMIC',()=>{this.comicPage=0;this.setScreen('comic');},{size:15,fill:'#3a567f',fill2:'#253555'});
    this.addButton(118,536,444,40,'CREDITS',()=>this.setScreen('credits'),{size:14,fill:'#303d60',fill2:'#202a48'});
    const stars=Object.values(this.progress.stars).reduce((a,b)=>a+b,0),mastered=Object.values(this.progress.stars).filter(v=>v===3).length;
    statCard(ctx,118,592,136,66,'ROOMS OPEN',`${Math.min(this.progress.unlocked,100)}/100`,theme.accent);
    statCard(ctx,272,592,136,66,'PRISM STARS',`${stars}/300`,'#ffd35a');
    statCard(ctx,426,592,136,66,'MASTERED',`${mastered}`,'#78f0a4','3★ rooms');
    pill(ctx,598,628,188,28,`VAULT SECRETS  ${this.secretCount()}/${SECRET_DEFINITIONS.length}`,'#b68cff',{size:10,fill:'rgba(47,24,77,.68)'});
    if(this.secretCount()===SECRET_DEFINITIONS.length)text(ctx,'THE VAULT KNOWS YOUR NAME',692,675,11,'#fff27a','center',1000);
    text(ctx,'ENTER / A SELECTS  •  TAB / D-PAD NAVIGATES  •  F FULLSCREEN',340,687,12,'rgba(255,255,255,.62)','center',800);
  }

  renderComic(now) {
    const ctx=this.ctx,page=this.comicPage,theme=CHAPTERS[page*2%10];drawBackdrop(ctx,theme,this.t,'title');ctx.fillStyle='rgba(5,8,25,.64)';ctx.fillRect(0,0,1280,720);
    panel(ctx,44,28,1192,660,'rgba(12,18,45,.96)',page===2?'#ff6d7a':theme.accent,22);
    pill(ctx,76,50,142,28,`STORY  ${page+1} / ${COMIC_COPY.length}`,page===2?'#ff6d7a':theme.accent,{size:11});
    drawComicPanel(ctx,76,90,1128,402,page,this.t);
    shadowText(ctx,COMIC_COPY[page][0],640,530,33,page===2?'#ff8a95':'#fff4cf','center',1000);
    const lines=this.wrapText(COMIC_COPY[page][1],18,1000);lines.slice(0,2).forEach((line,i)=>text(ctx,line,640,570+i*25,18,'#dfe8ff','center',700));
    this.drawProgressBar(510,630,260,8,page+1,COMIC_COPY.length,page===2?'#ff6d7a':theme.accent,'STORY PROGRESS',`${page+1}/${COMIC_COPY.length}`);
    this.addButton(1028,620,176,48,page===4?'START CAMPAIGN':'NEXT PANEL',()=>this.advanceComic(),{size:16,fill:page===2?'#d64d68':'#8c62dc',fill2:page===2?'#8d294d':'#48378f'});
    if(page>0)this.addButton(76,620,126,48,'BACK',()=>{this.comicPage--;},{size:15,fill:'#465477',fill2:'#29334f'});
    text(ctx,'← / → REVIEW  •  ENTER ADVANCE  •  ESC TITLE',640,673,11,'rgba(255,255,255,.55)','center',800);
  }

  wrapText(str,size,maxWidth) {
    const ctx=this.ctx;ctx.save();ctx.font=`700 ${size}px ui-rounded, Trebuchet MS, system-ui`;const words=str.split(' '),lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);ctx.restore();return lines;
  }

  renderGame(now) {
    const ctx=this.ctx,theme=this.level.theme;drawBackdrop(ctx,theme,this.t);
    panel(ctx,20,16,1240,114,'rgba(8,13,34,.91)',theme.accent,22);
    pill(ctx,42,34,138,27,`ROOM ${String(this.level.number).padStart(3,'0')}`,theme.accent,{size:11});
    fittedText(ctx,this.level.name,42,78,440,29,'#fff4cf','left',1000,19);
    fittedText(ctx,this.level.place,42,106,440,13,'rgba(255,255,255,.66)','left',700,10);
    this.drawHudToken(520,37,116,'◆',this.remainingShards(),theme.accent,'SPARKS');
    this.drawHudToken(648,37,116,'⌕',this.keys,'#ffe071','KEYS');
    this.drawHudToken(776,37,116,'↻',this.turns,'#9beeff','TURNS',`PAR ${this.level.par}`);
    const totalShards=this.level.entities.filter(e=>e.kind==='shard').length,collected=totalShards-this.remainingShards();
    this.drawProgressBar(520,105,372,8,collected,totalShards,theme.accent,'ROOM OBJECTIVE',this.remainingShards()?`${this.remainingShards()} SPARK${this.remainingShards()===1?'':'S'} LEFT`:'EXIT UNLOCKED');
    pill(ctx,910,86,116,28,this.remainingShards()?'COLLECT ALL':'REACH EXIT',this.remainingShards()?theme.accent:'#78f0a4',{size:10,fill:'rgba(8,13,34,.82)'});
    this.addButton(1038,37,92,55,'UNDO',()=>this.undo(),{size:14,fill:'#5068a8',fill2:'#2b3b72'});
    this.addButton(1140,37,92,55,'PAUSE',()=>this.setScreen('paused'),{size:13,fill:'#5068a8',fill2:'#2b3b72'});
    ctx.save();ctx.shadowColor='rgba(0,0,0,.48)';ctx.shadowBlur=35;ctx.shadowOffsetY=18;rr(ctx,GRID_X-12,GRID_Y-12,COLS*GRID_SIZE+24,ROWS*GRID_SIZE+24,22);fillStroke(ctx,'rgba(7,10,29,.78)',theme.accent,3);ctx.restore();
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)drawTile(ctx,this.grid[y][x],GRID_X+x*GRID_SIZE,GRID_Y+y*GRID_SIZE,GRID_SIZE,theme,this.t);
    const order={plate:0,exit:1,shard:2,key:3,door:4,gate:5,crate:6,enemy:7,player:8};
    const sorted=[...this.entities].sort((a,b)=>(order[a.kind]??5)-(order[b.kind]??5));
    for(const e of sorted){const p=this.displayPosition(e,now);const x=GRID_X+p.x*GRID_SIZE,y=GRID_Y+p.y*GRID_SIZE;const active=e.kind==='exit'?this.remainingShards()===0:e.kind==='gate'?this.isGateOpen():e.kind==='plate'?this.entities.some(o=>['crate','player'].includes(o.kind)&&o.x===e.x&&o.y===e.y):true;drawEntity(ctx,e,x,y,GRID_SIZE,this.t,theme,active);}
    for(const b of this.beams){const age=(now-b.born)/b.life;ctx.save();ctx.globalAlpha=1-age;ctx.shadowColor='#ff516d';ctx.shadowBlur=16;ctx.strokeStyle='#fff';ctx.lineWidth=6*(1-age)+2;ctx.beginPath();ctx.moveTo(GRID_X+(b.x1+.5)*GRID_SIZE,GRID_Y+(b.y1+.5)*GRID_SIZE);ctx.lineTo(GRID_X+(b.x2+.5)*GRID_SIZE,GRID_Y+(b.y2+.5)*GRID_SIZE);ctx.stroke();ctx.strokeStyle='#ff516d';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
    this.renderParticles();if(now<this.bannerUntil)this.renderChapterBanner(now);
  }

  renderParticles(){const ctx=this.ctx;for(const p of this.particles){ctx.save();ctx.globalAlpha=clamp(p.life/.35,0,1);ctx.shadowColor=p.color;ctx.shadowBlur=8;const frame=p.shape%8,sx=(frame%4)*160,sy=Math.floor(frame/4)*160,size=18+p.size*3;ctx.translate(p.x,p.y);ctx.rotate(this.t*2+p.x*.01);ctx.drawImage(this.assets.vfxSprites,sx,sy,160,160,-size/2,-size/2,size,size);ctx.restore();}}

  renderChapterBanner(now){const ctx=this.ctx,left=this.bannerUntil-now,a=clamp(Math.min((2600-left)/250,left/350),0,1);ctx.save();ctx.globalAlpha=a;panel(ctx,260,252,760,210,'rgba(7,10,29,.96)',this.level.theme.accent,28);pill(ctx,510,274,260,28,`CHAPTER ${this.level.chapter+1}  •  ROOM ${this.level.stage+1}`,this.level.theme.accent,{size:11});fittedText(ctx,this.level.name,640,331,660,39,'#fff4cf','center',1000,24);text(ctx,this.featureSummary(),640,374,12,this.level.theme.accent,'center',1000);divider(ctx,330,397,620,'rgba(255,255,255,.18)');const lines=this.wrapText(this.level.hint,15,650);lines.slice(0,2).forEach((line,i)=>text(ctx,line,640,424+i*22,15,'rgba(255,255,255,.76)','center',700));ctx.restore();}

  renderPause(){const ctx=this.ctx,theme=this.level.theme;ctx.fillStyle='rgba(4,7,22,.76)';ctx.fillRect(0,0,1280,720);panel(ctx,330,78,620,574,'rgba(15,22,55,.97)',theme.accent,30);pill(ctx,530,106,220,28,'GAME PAUSED',theme.accent,{size:11});fittedText(ctx,this.level.name,640,161,520,35,'#fff4cf','center',1000,23);text(ctx,this.featureSummary(),640,199,11,theme.accent,'center',1000);statCard(ctx,396,226,146,68,'TURNS',this.turns,'#9beeff',`PAR ${this.level.par}`);statCard(ctx,566,226,146,68,'SPARKS LEFT',this.remainingShards(),theme.accent);statCard(ctx,736,226,146,68,'KEYS',this.keys,'#ffe071');this.wrapText(this.level.designNote,14,500).slice(0,2).forEach((line,i)=>text(ctx,line,640,320+i*21,14,'#d9e9ff','center',700));this.addButton(456,372,368,58,'RESUME ROOM',()=>this.setScreen('playing'),{size:21,fill:'#6d65c9',fill2:'#3b397f'});this.addButton(456,444,178,50,'RESTART',()=>this.restartLevel(),{size:15,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(646,444,178,50,'DIRECTORY',()=>this.setScreen('levelSelect'),{size:14,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(456,506,178,50,'OPTIONS',()=>this.setScreen('settings'),{size:15,fill:'#465477',fill2:'#29334f'});this.addButton(646,506,178,50,'HOW TO PLAY',()=>this.setScreen('help'),{size:13,fill:'#465477',fill2:'#29334f'});this.addButton(456,568,368,42,'QUIT TO TITLE',()=>this.setScreen('title'),{size:13,fill:'#39445f',fill2:'#222a41'});text(ctx,'ESC RESUME  •  H HINT  •  Z UNDO  •  R RESTART',640,631,11,'rgba(255,255,255,.55)','center',800);}

  renderVictory(){const ctx=this.ctx,theme=this.level.theme;ctx.fillStyle='rgba(6,9,27,.72)';ctx.fillRect(0,0,1280,720);panel(ctx,312,94,656,548,'rgba(21,28,66,.98)','#ffd35a',32);pill(ctx,530,120,220,28,'ROOM RESTORED','#78f0a4',{size:11,fill:'rgba(10,48,34,.72)'});fittedText(ctx,this.level.name,640,178,550,38,'#fff4cf','center',1000,23);this.drawStars(574,257,this.victoryStars,66,27,12);statCard(ctx,396,316,146,70,'YOUR ROUTE',`${this.turns}`,'#9beeff','turns');statCard(ctx,566,316,146,70,'PAR',`${this.level.par}`,'#ffd35a');statCard(ctx,736,316,146,70,'OPTIMAL',`${this.level.optimalTurns}`,'#78f0a4');const grade=this.victoryStars===3?'MASTERED':this.victoryStars===2?'RESTORED':'CLEARED';pill(ctx,526,408,228,30,grade,this.victoryStars===3?'#78f0a4':'#ffd35a',{size:12});this.addButton(438,456,404,62,this.levelIndex===99?'RESTORE THE PRISM HEART':'CONTINUE TO NEXT ROOM',()=>this.nextLevel(),{size:19,fill:'#8c62dc',fill2:'#48378f'});this.addButton(438,532,194,50,'REPLAY',()=>this.restartLevel(),{size:15,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(648,532,194,50,'DIRECTORY',()=>this.setScreen('levelSelect'),{size:14,fill:'#5068a8',fill2:'#2b3b72'});text(ctx,'ENTER CONTINUE  •  R REPLAY  •  ESC DIRECTORY',640,610,11,'rgba(255,255,255,.55)','center',800);}

  starPath(ctx,x,y,r1,r2){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?r2:r1;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}

  renderDefeat(){const ctx=this.ctx;ctx.fillStyle='rgba(25,5,20,.78)';ctx.fillRect(0,0,1280,720);panel(ctx,350,112,580,500,'rgba(48,22,47,.98)','#ff6d7a',30);pill(ctx,530,140,220,28,'ROUTE INTERRUPTED','#ff8a95',{size:11,fill:'rgba(70,16,35,.72)'});shadowText(ctx,'PIP GOT SCRAMBLED',640,202,38,'#fff4cf');const lines=this.wrapText(this.defeatReason||'That route needs another idea.',17,450);lines.slice(0,2).forEach((line,i)=>text(ctx,line,640,257+i*25,17,'#f2dbe4','center',700));panel(ctx,414,322,452,82,'rgba(17,12,32,.72)','rgba(255,255,255,.12)',16);text(ctx,'ROOM CLUE',438,344,10,'#ff9ba6','left',1000);this.wrapText(this.level.hint,13,400).slice(0,2).forEach((line,i)=>text(ctx,line,438,368+i*18,13,'#d9e9ff','left',700));this.addButton(446,432,388,62,'TRY AGAIN',()=>this.restartLevel(),{size:22,fill:'#d64d68',fill2:'#8d294d'});this.addButton(446,508,186,50,'UNDO TURN',()=>{this.setScreen('playing');this.undo();},{size:15,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(648,508,186,50,'DIRECTORY',()=>this.setScreen('levelSelect'),{size:14,fill:'#5068a8',fill2:'#2b3b72'});text(ctx,'ENTER RETRY  •  Z UNDO  •  ESC DIRECTORY',640,584,11,'rgba(255,255,255,.55)','center',800);}

  renderLevelSelect(now){const ctx=this.ctx,chapter=this.levelSelectChapter,theme=CHAPTERS[chapter];drawBackdrop(ctx,theme,this.t,'title');ctx.fillStyle='rgba(6,9,27,.74)';ctx.fillRect(0,0,1280,720);panel(ctx,34,22,1212,676,'rgba(11,17,45,.95)',theme.accent,28);pill(ctx,66,48,212,28,'PRISM VAULT DIRECTORY',theme.accent,{size:11});fittedText(ctx,`${chapter+1}. ${theme.name}`,66,101,680,36,'#fff4cf','left',1000,25);fittedText(ctx,theme.place,66,137,680,15,'#d9e9ff','left',700,11);const start=chapter*10,chapterStars=Array.from({length:10},(_,i)=>this.progress.stars[String(start+i)]||0).reduce((a,b)=>a+b,0),chapterOpen=Math.max(0,Math.min(10,this.progress.unlocked-start));pill(ctx,760,70,190,30,`${chapterOpen}/10 ROOMS OPEN`,theme.accent,{size:11});pill(ctx,960,70,150,30,`${chapterStars}/30 ★`,'#ffd35a',{size:12,fill:'rgba(65,45,8,.72)'});this.addButton(1124,54,42,42,'◀',()=>{this.levelSelectChapter=(chapter+9)%10;},{size:20,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(1174,54,42,42,'▶',()=>{this.levelSelectChapter=(chapter+1)%10;},{size:20,fill:'#5068a8',fill2:'#2b3b72'});this.drawProgressBar(760,130,456,8,chapterOpen,10,theme.accent,'CHAPTER ACCESS',`${chapterOpen*10}%`);
    for(let i=0;i<10;i++){const idx=start+i,unlocked=idx<this.progress.unlocked,x=66+(i%5)*230,y=174+Math.floor(i/5)*174,stars=this.progress.stars[String(idx)]||0,best=this.progress.best[String(idx)];const buttonIndex=this.buttons.length,focused=buttonIndex===this.focusIndex,b={x,y,w:210,h:152,label:LEVELS[idx].name,disabled:!unlocked,action:()=>unlocked&&this.loadLevel(idx),focused};this.buttons.push(b);const hover=unlocked&&(focused||this.mouse.x>=x&&this.mouse.x<=x+210&&this.mouse.y>=y&&this.mouse.y<=y+152);ctx.save();ctx.translate(0,hover?-3:0);ctx.shadowColor=hover?'rgba(0,0,0,.45)':'rgba(0,0,0,.25)';ctx.shadowBlur=hover?20:12;ctx.shadowOffsetY=7;rr(ctx,x,y,210,152,18);fillStroke(ctx,unlocked?(hover?'#3d5292':'#273668'):'#171e3a',focused?theme.accent:unlocked?'rgba(255,255,255,.18)':'#30364f',focused?4:2);ctx.shadowColor='transparent';pill(ctx,x+14,y+14,66,23,String(idx+1).padStart(3,'0'),unlocked?theme.accent:'#525a73',{size:10,fill:'rgba(5,9,27,.64)',stroke:unlocked?theme.accent:'#525a73'});fittedText(ctx,LEVELS[idx].name,x+14,y+57,182,17,unlocked?'#fff4cf':'#656b82','left',900,12);const feature=this.featureSummary(LEVELS[idx]).split('  •  ')[0];fittedText(ctx,unlocked?feature:'SEALED',x+14,y+83,182,10,unlocked?theme.accent:'#555a70','left',1000,8);text(ctx,unlocked?(best?`BEST ${best}  •  PAR ${LEVELS[idx].par}`:`UNPLAYED  •  PAR ${LEVELS[idx].par}`):'COMPLETE PRIOR ROOMS',x+14,y+108,10,unlocked?'#c8d7ff':'#555a70','left',800);for(let s=0;s<3;s++){ctx.fillStyle=s<stars?'#ffd35a':'#202743';ctx.strokeStyle=s<stars?'#fff1aa':'#48506c';ctx.lineWidth=1.5;this.starPath(ctx,x+25+s*28,y+133,9,4);ctx.fill();ctx.stroke();}if(!unlocked){ctx.strokeStyle='#565d78';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+174,y+35,10,Math.PI,0);ctx.stroke();rr(ctx,x+164,y+34,20,18,4);ctx.fillStyle='#565d78';ctx.fill();}ctx.restore();}
    const story=this.wrapText(theme.story,14,820);story.slice(0,2).forEach((line,i)=>text(ctx,line,640,548+i*20,14,'rgba(255,255,255,.67)','center',700));this.addButton(66,608,170,48,'BACK TO TITLE',()=>this.setScreen('title'),{size:14,fill:'#465477',fill2:'#29334f'});const totalStars=Object.values(this.progress.stars).reduce((a,b)=>a+b,0);pill(ctx,920,616,296,30,`${Math.min(this.progress.unlocked,100)} ROOMS OPEN  •  ${totalStars}/300 STARS`,'#ffd35a',{size:11});text(ctx,'← / → CHANGE CHAPTER  •  TAB / ↑ / ↓ SELECT  •  ENTER PLAY',640,678,10,'rgba(255,255,255,.52)','center',800);}

  renderHelp(now){const ctx=this.ctx,theme=CHAPTERS[0];drawBackdrop(ctx,theme,this.t,'title');ctx.fillStyle='rgba(5,8,25,.77)';ctx.fillRect(0,0,1280,720);panel(ctx,68,38,1144,646,'rgba(12,19,49,.97)','#60e6ff',30);pill(ctx,530,62,220,28,'SPARKKEEPER HANDBOOK','#60e6ff',{size:11});shadowText(ctx,'HOW TO PLAY',640,110,42,'#fff4cf');panel(ctx,104,148,500,386,'rgba(7,13,34,.74)','rgba(96,230,255,.32)',20);panel(ctx,626,148,550,386,'rgba(7,13,34,.74)','rgba(255,211,90,.30)',20);text(ctx,'MISSION & CONTROLS',132,180,17,'#60e6ff','left',1000);this.wrapText('Collect every Prism Spark, then reach the lit exit. Pip moves once; every guard responds once.',15,440).slice(0,3).forEach((line,i)=>text(ctx,line,132,216+i*22,15,'#e4ebff','left',700));divider(ctx,126,278,456);const controls=[['MOVE','ARROWS / WASD / D-PAD'],['UNDO','Z / BACKSPACE / GAMEPAD B'],['RESTART','R / GAMEPAD X'],['HINT','H / GAMEPAD Y'],['PAUSE','ESC / P / START']];controls.forEach(([label,value],i)=>{pill(ctx,132,296+i*43,92,27,label,'#60e6ff',{size:10});fittedText(ctx,value,240,310+i*43,320,13,'#d7e3ff','left',800,10);});text(ctx,'PUZZLE LANGUAGE',654,180,17,'#ffd35a','left',1000);const rules=[['KEYS','Open one lock and are consumed.'],['CRATES','Activate plates and block patrols.'],['ICE','Preserves momentum until blocked.'],['CONVEYORS','Force movement in their direction.'],['COILS','Teleport between paired pads.'],['FRAGILE','Collapse after Pip leaves.'],['DANGER','Spikes, guards, hazards, and beams are lethal.']];rules.forEach(([label,value],i)=>{text(ctx,label,654,216+i*42,11,'#ffd35a','left',1000);fittedText(ctx,value,728,216+i*42,420,13,'#e4ebff','left',700,10);});pill(ctx,210,554,860,30,'EXPERIMENT FREELY — UNDO IS UNLIMITED AND HINTS NEVER COST STARS','#78f0a4',{size:11,fill:'rgba(10,48,34,.62)'});this.addButton(400,602,220,50,'BACK',()=>this.setScreen(this.previousScreen==='help'?'title':this.previousScreen),{size:16,fill:'#465477',fill2:'#29334f'});this.addButton(660,602,220,50,'PLAY CAMPAIGN',()=>this.startCampaign(),{size:16,fill:'#8c62dc',fill2:'#48378f'});}

  renderCredits(now){
    const ctx=this.ctx;drawBackdrop(ctx,CHAPTERS[9],this.t,'title');ctx.fillStyle='rgba(5,8,25,.81)';ctx.fillRect(0,0,1280,720);
    panel(ctx,178,30,924,660,'rgba(12,18,46,.97)','#ffd35a',30);drawLogo(ctx,640,108,.48);
    pill(ctx,492,169,296,28,'PIP’S POCKET WORLDS  •  ENTRY ONE','#9fe9ff',{size:11});divider(ctx,246,205,788);
    text(ctx,'CREATED BY',640,232,10,'#9fe9ff','center',1000);text(ctx,'Alex De Vries Xing',640,260,22,'#fff4cf','center',1000);
    panel(ctx,244,292,792,112,'rgba(7,13,34,.70)','rgba(255,255,255,.12)',18);
    text(ctx,'PRODUCTION',270,318,10,'#ffd35a','left',1000);fittedText(ctx,'Game design, campaign, engineering, art direction, UI, audio, and release production',270,344,740,13,'#d9e4ff','left',700,10);
    text(ctx,'ARTWORK',270,372,10,'#ffd35a','left',1000);fittedText(ctx,'Original AI-assisted production art, individually sliced, validated, and integrated',270,394,740,13,'#d9e4ff','left',700,10);
    const discovered=this.secretCount();
    panel(ctx,244,422,792,126,'rgba(7,13,34,.72)','rgba(182,140,255,.30)',18);
    text(ctx,'VAULT SECRET LEDGER',270,448,11,'#c9a9ff','left',1000);pill(ctx,854,434,154,28,`${discovered}/${SECRET_DEFINITIONS.length} FOUND`,'#b68cff',{size:10});
    SECRET_DEFINITIONS.forEach((secret,i)=>{const found=!!this.progress.secrets?.[secret.id],col=i%3,row=Math.floor(i/3),x=270+col*246,y=474+row*36;ctx.save();ctx.globalAlpha=found?1:.56;ctx.fillStyle=found?'#78f0a4':'#59617c';ctx.beginPath();ctx.arc(x+6,y,5,0,Math.PI*2);ctx.fill();fittedText(ctx,found?secret.label:'UNDISCOVERED',x+20,y,210,11,found?'#e8fff0':'#9aa3bb','left',900,9);ctx.restore();});
    if(this.progress.secrets?.null)text(ctx,'“ORDER IS TERRIBLY OVERRATED.” — B.N.',640,570,12,'#c9a9ff','center',900);
    else text(ctx,'The Vault rewards curiosity, patience, and suspiciously specific inputs.',640,570,12,'#c7d4f4','center',750);
    text(ctx,'Canvas 2D  •  Web Audio  •  Cloudflare Pages PWA  •  No tracking or advertising',640,600,12,'#c7d4f4','center',750);
    text(ctx,'RELEASE 3.6  •  MIT License  •  © 2026 Alex De Vries Xing',640,626,11,'rgba(255,255,255,.60)','center',750);
    this.addButton(500,644,280,38,'BACK TO TITLE',()=>this.setScreen('title'),{size:14,fill:'#6d65c9',fill2:'#3b397f'});
  }

  renderChapterComplete(now){const ctx=this.ctx,chapter=CHAPTERS[this.completedChapter];drawBackdrop(ctx,chapter,this.t,'title');ctx.fillStyle='rgba(5,8,25,.72)';ctx.fillRect(0,0,1280,720);panel(ctx,186,58,908,594,'rgba(15,22,56,.95)',chapter.accent,32);pill(ctx,505,84,270,28,`CHAPTER ${this.completedChapter+1} RESTORED`,'#78f0a4',{size:11,fill:'rgba(10,48,34,.68)'});fittedText(ctx,chapter.name.toUpperCase(),640,146,760,46,'#fff4cf','center',1000,28);drawHero(ctx,270,190,230,this.t,{x:1,y:0},'victory');const start=this.completedChapter*10;let stars=0;for(let i=start;i<start+10;i++)stars+=this.progress.stars[String(i)]||0;statCard(ctx,650,224,168,74,'PRISM STARS',`${stars}/30`,'#ffd35a');statCard(ctx,838,224,168,74,'ROOMS RESTORED','10/10','#78f0a4');panel(ctx,620,324,416,118,'rgba(7,13,34,.70)','rgba(255,255,255,.12)',17);text(ctx,'WORLD RESTORED',646,347,10,chapter.accent,'left',1000);this.wrapText(chapter.story,15,360).slice(0,3).forEach((line,i)=>text(ctx,line,646,374+i*22,15,'#e4ebff','left',700));pill(ctx,650,466,356,30,`NEXT: ${CHAPTERS[this.completedChapter+1]?.name??'THE PRISM HEART'}`,chapter.accent,{size:11});this.addButton(448,548,336,58,'CONTINUE JOURNEY',()=>this.continueAfterChapter(),{size:19,fill:'#8c62dc',fill2:'#48378f'});this.addButton(806,548,176,58,'DIRECTORY',()=>this.setScreen('levelSelect'),{size:14,fill:'#465477',fill2:'#29334f'});text(ctx,'ENTER CONTINUE  •  ESC DIRECTORY',640,626,11,'rgba(255,255,255,.55)','center',800);}

  renderSettings(now){const ctx=this.ctx;drawBackdrop(ctx,CHAPTERS[4],this.t,'title');ctx.fillStyle='rgba(5,8,25,.75)';ctx.fillRect(0,0,1280,720);panel(ctx,314,48,652,624,'rgba(15,22,57,.98)','#b68cff',30);pill(ctx,530,74,220,28,'VAULT CONFIGURATION','#b68cff',{size:11});shadowText(ctx,'OPTIONS',640,130,42,'#fff4cf');text(ctx,'Accessibility, sound, and display preferences',640,166,14,'#cfd9ff','center',700);this.settingRow(374,204,'SOUND & MUSIC','Master music and effects output.',this.audio.enabled,()=>this.audio.toggle(),'#78f0a4');this.settingRow(374,292,'REDUCED MOTION','Limits particles, screen shake, and animation.',this.settings.reducedMotion,()=>{this.settings.reducedMotion=!this.settings.reducedMotion;storage.set('pip.motion',this.settings.reducedMotion);},'#9beeff');this.settingRow(374,380,'HIGH CONTRAST','Boosts scene separation and UI readability.',this.settings.highContrast,()=>{this.settings.highContrast=!this.settings.highContrast;storage.set('pip.contrast',this.settings.highContrast);},'#ffd35a');panel(ctx,374,468,532,66,'rgba(7,13,34,.72)','rgba(255,255,255,.12)',16);text(ctx,'DISPLAY MODE',396,489,15,'#fff4cf','left',900);text(ctx,'Switch between windowed and fullscreen play.',396,513,12,'#aebdde','left',700);this.addButton(740,480,144,42,document.fullscreenElement?'EXIT FULLSCREEN':'FULLSCREEN',()=>this.toggleFullscreen(),{size:12,fill:'#5068a8',fill2:'#2b3b72'});this.addButton(440,558,400,58,'SAVE & RETURN',()=>this.setScreen(this.previousScreen==='settings'?'title':this.previousScreen),{size:19,fill:'#6d65c9',fill2:'#3b397f'});text(ctx,'M SOUND  •  F FULLSCREEN  •  ESC BACK',640,638,11,'rgba(255,255,255,.56)','center',800);}

  settingRow(x,y,label,description,value,action,accent='#78f0a4'){const ctx=this.ctx;panel(ctx,x,y,532,70,'rgba(7,13,34,.72)','rgba(255,255,255,.12)',16);text(ctx,label,x+22,y+24,15,'#fff4cf','left',900);fittedText(ctx,description,x+22,y+48,350,11,'#aebdde','left',700,9);const bx=x+410,by=y+15,bw=96,bh=40,buttonIndex=this.buttons.length,focused=buttonIndex===this.focusIndex,b={x:bx,y:by,w:bw,h:bh,label,action,focused};this.buttons.push(b);ctx.save();rr(ctx,bx,by,bw,bh,20);ctx.fillStyle=value?accent:'#30374f';ctx.fill();ctx.strokeStyle=focused?'#ffffff':value?'rgba(255,255,255,.52)':'#59617c';ctx.lineWidth=focused?4:2;ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(value?bx+73:bx+23,by+20,14,0,Math.PI*2);ctx.fill();text(ctx,value?'ON':'OFF',value?bx+22:bx+55,by+20,10,value?'#10291d':'#d7dced','center',1000);ctx.restore();}

  renderComplete(now){const ctx=this.ctx;drawBackdrop(ctx,CHAPTERS[9],this.t,'title');ctx.save();ctx.globalAlpha=.76;ctx.drawImage(this.assets.keyArt,0,0,1600,900,0,0,1280,720);ctx.restore();ctx.fillStyle='rgba(7,9,28,.68)';ctx.fillRect(0,0,1280,720);panel(ctx,154,46,972,632,'rgba(14,19,53,.92)','#fff27a',32);pill(ctx,514,72,252,28,'THE PRISM HEART IS WHOLE','#78f0a4',{size:11,fill:'rgba(10,48,34,.68)'});shadowText(ctx,'LIGHT RETURNS',640,142,56,'#fff4cf');drawHero(ctx,512,184,224,this.t,{x:1,y:0},'heroic');const stars=Object.values(this.progress.stars).reduce((a,b)=>a+b,0),mastered=Object.values(this.progress.stars).filter(v=>v===3).length,totalBest=Object.keys(this.progress.best).length;statCard(ctx,350,424,176,74,'PRISM STARS',`${stars}/300`,'#ffd35a');statCard(ctx,552,424,176,74,'MASTERED ROOMS',`${mastered}/100`,'#78f0a4');statCard(ctx,754,424,176,74,'VAULT SECRETS',`${this.secretCount()}/${SECRET_DEFINITIONS.length}`,'#b68cff');text(ctx,'Every pocket world hums in harmony again. Baron Null escaped through a tiny crack—',640,532,16,'#e5e8ff','center',700);text(ctx,this.progress.secrets?.null?'A folded memo flutters after him: “NEXT TIME, MORE CHAOS.”':'but Pip knows this is only the beginning.',640,558,16,this.progress.secrets?.null?'#c9a9ff':'#e5e8ff','center',700);this.addButton(382,594,308,52,'RETURN TO TITLE',()=>this.setScreen('title'),{size:17,fill:'#8c62dc',fill2:'#48378f'});this.addButton(706,594,192,52,'CREDITS',()=>this.setScreen('credits'),{size:15,fill:'#465477',fill2:'#29334f'});}

  renderArchiveOverlay(){
    const ctx=this.ctx;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.085;ctx.fillStyle='#6bc5ff';
    for(let y=0;y<720;y+=4)ctx.fillRect(0,y,1280,1);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.72;ctx.fillStyle='rgba(5,14,36,.72)';rr(ctx,1044,18,214,28,10);ctx.fill();ctx.strokeStyle='rgba(119,216,255,.48)';ctx.lineWidth=1.5;ctx.stroke();
    text(ctx,'64K ARCHIVE MEMORY',1151,32,10,'#9fe9ff','center',1000);ctx.restore();
  }

  renderToast(){if(!this.toast)return;const ctx=this.ctx,a=clamp((this.toast.until-performance.now())/300,0,1),lines=this.wrapText(this.toast.message,15,430),h=48+(lines.length-1)*21,y=this.screen==='playing'?140:646-h;ctx.save();ctx.globalAlpha=a;panel(ctx,420,y,440,h,'rgba(8,13,34,.96)',this.level?.theme?.accent??'#60e6ff',17);ctx.fillStyle=this.level?.theme?.accent??'#60e6ff';ctx.beginPath();ctx.arc(444,y+h/2,6,0,Math.PI*2);ctx.fill();lines.forEach((line,i)=>text(ctx,line,466,y+h/2+(i-(lines.length-1)/2)*21,15,'#fff4cf','left',850));ctx.restore();}
}
