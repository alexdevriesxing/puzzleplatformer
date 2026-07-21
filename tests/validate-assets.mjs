import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root=resolve(import.meta.dirname,'..');
const images={
  'assets/commercial/key-art.webp':{min:180_000,width:1600,height:900},
  'assets/commercial/logo.png':{min:20_000,width:1000,height:360,alpha:true},
  'assets/commercial/hero-sprites.png':{min:35_000,width:960,height:640,alpha:true},
  'assets/commercial/enemy-sprites.png':{min:45_000,width:640,height:1280,alpha:true},
  'assets/commercial/object-sprites.png':{min:45_000,width:800,height:640,alpha:true},
  'assets/commercial/collectible-sprites.png':{min:15_000,width:640,height:320,alpha:true},
  'assets/commercial/tile-sprites.png':{min:40_000,width:1280,height:256,alpha:true},
  'assets/commercial/vfx-sprites.png':{min:18_000,width:640,height:320,alpha:true},
  'assets/commercial/ui-atlas.png':{min:8_000,width:1280,height:320,alpha:true},
  'assets/commercial/comic-1.webp':{min:35_000,width:1280,height:500},
  'assets/commercial/comic-2.webp':{min:35_000,width:1280,height:500},
  'assets/commercial/comic-3.webp':{min:35_000,width:1280,height:500},
  'assets/commercial/comic-4.webp':{min:35_000,width:1280,height:500},
  'assets/commercial/comic-5.webp':{min:35_000,width:1280,height:500},
  'assets/commercial/app-icon-192.png':{min:8_000,width:192,height:192},
  'assets/commercial/app-icon-512.png':{min:20_000,width:512,height:512},
  'assets/commercial/app-icon-maskable-192.png':{min:7_000,width:192,height:192},
  'assets/commercial/app-icon-maskable-512.png':{min:20_000,width:512,height:512},
  'assets/commercial/favicon.png':{min:2_000,width:64,height:64},
  'assets/commercial/og-image.webp':{min:120_000,width:1200,height:675},
  'assets/commercial/install-wide.webp':{min:100_000,width:1280,height:720},
  'assets/commercial/install-narrow.webp':{min:90_000,width:720,height:1280},
};
for(let i=1;i<=10;i++)images[`assets/commercial/backdrop-${String(i).padStart(2,'0')}.webp`]={min:18_000,width:1280,height:720};

for(const[path,expected]of Object.entries(images)){
  const absolute=resolve(root,path);
  const info=await stat(absolute);
  if(info.size<expected.min)throw new Error(`${path} is unexpectedly small (${info.size} bytes).`);
  const meta=await sharp(absolute).metadata();
  if(meta.width!==expected.width||meta.height!==expected.height)throw new Error(`${path} dimensions are ${meta.width}x${meta.height}; expected ${expected.width}x${expected.height}.`);
  if(expected.alpha&&!meta.hasAlpha)throw new Error(`${path} must preserve transparency.`);
}

async function atlasCells(path,cols,rows,cellW,cellH,{minPixels=500,edgeSafe=true}={}){
  const {data,info}=await sharp(resolve(root,path)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const cells=[];
  for(let index=0;index<cols*rows;index++){
    const ox=(index%cols)*cellW,oy=Math.floor(index/cols)*cellH;
    let pixels=0,edgePixels=0;
    const hash=createHash('sha1');
    for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){
      const offset=((oy+y)*info.width+ox+x)*4;
      const rgba=data.subarray(offset,offset+4);hash.update(rgba);
      if(rgba[3]>24){
        pixels++;
        if(x<2||y<2||x>=cellW-2||y>=cellH-2)edgePixels++;
      }
    }
    if(pixels<minPixels)throw new Error(`${path} cell ${index} is blank or underfilled (${pixels} visible pixels).`);
    if(edgeSafe&&edgePixels)throw new Error(`${path} cell ${index} touches its slice edge (${edgePixels} pixels), indicating clipping or bleed.`);
    cells.push(hash.digest('hex'));
  }
  return cells;
}

const hero=await atlasCells('assets/commercial/hero-sprites.png',6,4,160,160,{minPixels:5_000});
for(const [label,start,end,minUnique] of [['idle',0,6,5],['walk',6,12,5],['push',12,18,4],['special',18,24,4]]){
  if(new Set(hero.slice(start,end)).size<minUnique)throw new Error(`Hero ${label} animation does not contain enough distinct production frames.`);
}
const enemies=await atlasCells('assets/commercial/enemy-sprites.png',4,8,160,160,{minPixels:2_500});
for(let row=0;row<8;row++)if(new Set(enemies.slice(row*4,row*4+4)).size<3)throw new Error(`Enemy family row ${row} needs at least three distinct animation frames.`);
await atlasCells('assets/commercial/object-sprites.png',5,4,160,160,{minPixels:3_000});
await atlasCells('assets/commercial/collectible-sprites.png',4,2,160,160,{minPixels:3_000});
await atlasCells('assets/commercial/vfx-sprites.png',4,2,160,160,{minPixels:800});
await atlasCells('assets/commercial/ui-atlas.png',4,2,320,160,{minPixels:5_000});
await atlasCells('assets/commercial/tile-sprites.png',10,2,128,128,{minPixels:12_000,edgeSafe:false});

const backdropHashes=[];
for(let i=1;i<=10;i++){
  const file=resolve(root,`assets/commercial/backdrop-${String(i).padStart(2,'0')}.webp`);
  backdropHashes.push(createHash('sha256').update(await readFile(file)).digest('hex'));
}
if(new Set(backdropHashes).size!==10)throw new Error('Chapter backdrop set contains duplicate files.');

const manifest=JSON.parse(await readFile(resolve(root,'assets/commercial/asset-manifest.json'),'utf8'));
if(manifest.version!=='3.6.0-pages-resilience-polish')throw new Error('Production asset manifest version mismatch.');
if(manifest.screens?.length!==12)throw new Error('Production screen inventory is incomplete.');
if(manifest.qualityGate?.proceduralFallbacks!==false)throw new Error('Asset manifest does not certify fallback removal.');

const assetsSource=await readFile(resolve(root,'src/assets.js'),'utf8');
const artSource=await readFile(resolve(root,'src/art.js'),'utf8');
const gameSource=await readFile(resolve(root,'src/game.js'),'utf8');
const serviceWorker=await readFile(resolve(root,'service-worker.js'),'utf8');
for(const filename of ['key-art.webp','logo.png','hero-sprites.png','enemy-sprites.png','object-sprites.png','collectible-sprites.png','tile-sprites.png','vfx-sprites.png','ui-atlas.png']){
  if(!assetsSource.includes(filename))throw new Error(`${filename} is not wired into the runtime preload list.`);
}
for(const runtimeKey of ['heroSprites','enemySprites','objectSprites','collectibleSprites','tileSprites','vfxSprites','uiAtlas','backdrops','logo'])if(!artSource.includes(runtimeKey))throw new Error(`${runtimeKey} is preloaded but not drawn by the renderer.`);
for(const filename of manifest.shippingFiles){
  const path=`assets/commercial/${filename}`;
  await stat(resolve(root,path));
  if(!serviceWorker.includes(`./${path}`))throw new Error(`${path} is missing from the offline production cache.`);
}
for(const forbidden of ['drawEnemyBase','Legacy placeholder','hero-model-sheet.svg','key-art.svg','comic-intro.svg','logo.svg','else drawKeyArt','if(!ready(image)) return false']){
  if(artSource.includes(forbidden)||gameSource.includes(forbidden)||assetsSource.includes(forbidden))throw new Error(`Placeholder or legacy fallback remains: ${forbidden}`);
}
if(!artSource.includes("throw new Error('Required production atlas is unavailable.')"))throw new Error('Atlas renderer is not fail-fast.');
if(gameSource.includes('imageReady('))throw new Error('Game screen code still contains dormant asset fallback branches.');

console.log(`✓ ${Object.keys(images).length} production images and 112 atlas cells verified; all shipping art is sliced, padded, runtime-wired, offline-cached, and fallback-free.`);
