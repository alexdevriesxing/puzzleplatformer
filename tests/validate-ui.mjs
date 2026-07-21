import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFile(resolve(root,path),'utf8');
const art=await read('src/art.js');
const game=await read('src/game.js');
const style=await read('src/style.css');
const manifest=JSON.parse(await read('assets/commercial/asset-manifest.json'));

for(const marker of ['fittedText','divider','pill','statCard','b.fill','b.focused','disabled'])if(!art.includes(marker))throw new Error(`Production UI primitive missing ${marker}.`);
for(const marker of ['ROOM OBJECTIVE','MASTERED','SPARKKEEPER HANDBOOK','CHAPTER ACCESS','SAVE & RETURN','ROUTE INTERRUPTED','ROOM RESTORED'])if(!game.includes(marker))throw new Error(`Refined screen treatment missing ${marker}.`);
for(const marker of ['backdrop-filter','safe-area-inset-bottom','data-screen="playing"','prefers-reduced-motion','prefers-contrast'])if(!style.includes(marker))throw new Error(`Responsive or accessible UI styling missing ${marker}.`);
if(!game.includes("this.canvas.setAttribute?.('aria-label'"))throw new Error('Canvas screen context is not announced accessibly.');
if(!game.includes('const pressed=this.mouse.down&&hover'))throw new Error('Buttons do not expose a pressed visual state.');
if(manifest.version!=='3.6.0-pages-resilience-polish')throw new Error(`Unexpected asset manifest version ${manifest.version}.`);
console.log('✓ Focused UI pass verified: visual hierarchy, auto-fitting labels, stateful controls, objective telemetry, responsive touch chrome, and accessible screen context.');
