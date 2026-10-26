import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import {assembledEngine} from './engine-source.mjs';
// This entry point only creates an unpublished, isolated demo. No release path.
execFileSync(process.execPath,['work/v7/build.mjs','--pending'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/verify-baseline.mjs'],{stdio:'inherit'});
const read=name=>fs.readFile('work/v8/'+name,'utf8');
let controller=(await read('controller.js')).replace('__BLACKSITE_SHELL__',JSON.stringify(await read('game-shell.html'))).replace('__BLACKSITE_UI__',await read('interface.js')).replace('__BLACKSITE_LOOT_UI__',(await read('loot-ui.js')).replace('__BLACKSITE_SHOP_UI__',await read('shop-ui.js'))).replace('__BLACKSITE_COHERENCE__',await read('coherence-ui.js')).replace('__BLACKSITE_EXTRA_CONTROLS__',await read('extra-controls.js')).replace('__BLACKSITE_SAVE__',await read('settlement.js'));
const renderer="/* BLACKSITE v3.0: rendering and controller; demo session required. */\n(function(root){'use strict';const E=root.KMEBlacksiteEngine,esc=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));let mounted=null;\n"+await read('item-icons.js')+'\n'+(await read('graphics.js')).replace('__BLACKSITE_MODELS__',await read('armory-models.js')).replace('__BLACKSITE_EFFECTS__',await read('armory-effects.js'))+'\n'+controller;
const engine=assembledEngine;
let app=await fs.readFile('outputs/site/app.js','utf8');
for(const [old,code] of [['engine.js',engine],['blacksite.js',renderer],['studio.js',await read('studio.js')],['drawing.js',await read('drawing-host.js')]]){
  const original=await fs.readFile('work/v6/'+old,'utf8');if(app.split(original).length!==2)throw Error('Expected one source module: '+old);app=app.replace(original,()=>code);
}
const oldClose="$('urge-dialog').addEventListener('close',()=>{KMEUrge.destroy();urgeInstance=null;});";
if(!app.includes(oldClose))throw Error('Missing legacy quick-close listener');
app=app.replace(oldClose,"$('urge-dialog').addEventListener('close',()=>{if($('urge-dialog').open)return;KMEUrge.destroy();urgeInstance=null;});");
app=app.replace("$('urge-dialog').addEventListener('close',()=>{if(state.page==='arena')mountArena();});","$('urge-dialog').addEventListener('close',()=>{if(!$('urge-dialog').open&&state.page==='arena')mountArena();});");
const patches=JSON.parse(await fs.readFile('work/v6/patches.json','utf8'));
const next={version:'3.0',name:'GAMING WITHOUT NICOTINE',notes:'LOCAL DEMO: district expeditions, operatives and gadgets, readable combat HUD, no gun overheating, field requisitions, original environments, compact progression and improved drawing layers/opacity.'};
app=app.replace('window.KME_PATCHES='+JSON.stringify(patches)+';','window.KME_PATCHES='+JSON.stringify({...patches,current:next,history:[...patches.history,next]})+';');
app+='\n'+await read('demo-session.js')+'\n'+await read('live-session.js');
app+=`\nif(new URLSearchParams(location.search).get('game')==='blacksite'||window.KME_OPEN_BLACKSITE){const go=new MutationObserver(()=>{if(state.selected&&state.repo instanceof DemoRepository&&!document.querySelector('dialog[open]')){go.disconnect();navigate('arena');}});go.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});}\n`;
if(/__BLACKSITE_/.test(app))throw Error('Unresolved game assembly marker');
await fs.writeFile('outputs/site/demo-app.js',app);
await fs.writeFile('outputs/site/demo-styles.css',await fs.readFile('outputs/site/styles.css','utf8')+'\n'+await read('style.css')+'\n'+await read('armory.css')+'\n'+await read('shop.css')+'\n'+await read('item-icons.css')+'\n'+await read('coherence.css'));
let html=await fs.readFile('outputs/site/demo.html','utf8');
html=html.replaceAll('./app.js','./demo-app.js').replaceAll('./styles.css','./demo-styles.css').replace(/<title>.*?<\/title>/,'<title>BLACKSITE · v3.0 GAMING WITHOUT NICOTINE · LOCAL DEMO</title>');
html=html.replace(/connect-src [^;]+;/,"connect-src 'self';");
html=html.replace(/<script src="\.\/config\.js[^>]*><\/script>\s*/,'').replace(/<script src="\.\/vendor\/supabase-[^>]*><\/script>\s*/,'');
html=html.replaceAll('v=2.9.0-quality-of-nicotine-free-life-update','v=3.0.0-gaming-without-nicotine-demo').replace('<b>v2.9</b><span>quality of nicotine free life update</span>','<b>v3.0</b><span>GAMING WITHOUT NICOTINE · LOCAL DEMO</span>');
html=html.replace('LOCAL DEVELOPMENT PREVIEW · NOT UPLOADED','V3.0 · GAMING WITHOUT NICOTINE · LOCAL DEMO / NOT UPLOADED');
await fs.writeFile('outputs/site/demo.html',html);
await fs.writeFile('outputs/V3-LOCAL-BUILD.json',JSON.stringify({version:next.version,name:next.name,localOnly:true,liveApplicationUnchanged:true,demoConnections:'same-origin only; no Supabase SDK or public connection config loaded',appSHA256:crypto.createHash('sha256').update(app).digest('hex')},null,2)+'\n');
console.log('Built BLACKSITE v3.0 isolated local demo. Live app.js/index.html remain at v2.9.');
