const SOURCES = Object.freeze({
  keyArt: './assets/commercial/key-art.webp',
  logo: './assets/commercial/logo.png',
  heroSprites: './assets/commercial/hero-sprites.png',
  enemySprites: './assets/commercial/enemy-sprites.png',
  objectSprites: './assets/commercial/object-sprites.png',
  collectibleSprites: './assets/commercial/collectible-sprites.png',
  tileSprites: './assets/commercial/tile-sprites.png',
  vfxSprites: './assets/commercial/vfx-sprites.png',
  uiAtlas: './assets/commercial/ui-atlas.png',
  comic1: './assets/commercial/comic-1.webp',
  comic2: './assets/commercial/comic-2.webp',
  comic3: './assets/commercial/comic-3.webp',
  comic4: './assets/commercial/comic-4.webp',
  comic5: './assets/commercial/comic-5.webp',
});
const BACKDROPS = Array.from({length:10},(_,index)=>`./assets/commercial/backdrop-${String(index+1).padStart(2,'0')}.webp`);

function imageRequest(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const timeout=setTimeout(()=>reject(new Error(`Required production asset timed out: ${src}`)),20000);
    image.decoding='async';
    image.onload=async()=>{
      clearTimeout(timeout);
      try{await image.decode?.();}catch{}
      resolve(image);
    };
    image.onerror=()=>{clearTimeout(timeout);reject(new Error(`Required production asset failed to load: ${src}`));};
    image.src=src;
  });
}

async function loadImage(src){
  try{return await imageRequest(src);}
  catch(firstError){
    const joiner=src.includes('?')?'&':'?';
    try{return await imageRequest(`${src}${joiner}retry=${Date.now()}`);}
    catch{throw firstError;}
  }
}

export function createProductionAssets({onProgress=()=>{}}={}){
  const assets={};
  const jobs=[...Object.entries(SOURCES).map(([name,src])=>({name,src})),...BACKDROPS.map((src,index)=>({name:`backdrop${index}`,src,index}))];
  let completed=0;
  assets.backdrops=[];
  const entries=jobs.map(async job=>{
    const image=await loadImage(job.src);
    if(job.index==null)assets[job.name]=image;
    else assets.backdrops[job.index]=image;
    completed+=1;
    onProgress({completed,total:jobs.length,src:job.src});
  });
  assets.ready=Promise.all(entries).then(()=>assets);
  return assets;
}

export function imageReady(image){return !!image?.complete&&image.naturalWidth>0;}
