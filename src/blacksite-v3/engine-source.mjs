import fs from 'node:fs/promises';
export async function engineSource(){
 const read=name=>fs.readFile(new URL(name,import.meta.url),'utf8');
 let engine=await read('engine.js');
 for(const name of ['combat','economy','enemies'])engine=engine.replace('__BLACKSITE_'+name.toUpperCase()+'__',()=>sources[name]);
 return engine;
}
const sources=Object.fromEntries(await Promise.all(['combat','economy','enemies'].map(async name=>[name,await fs.readFile(new URL(name+'.js',import.meta.url),'utf8')])));
export const assembledEngine=await fs.readFile(new URL('campaign.js',import.meta.url),'utf8')+'\n'+await fs.readFile(new URL('armory.js',import.meta.url),'utf8')+'\n'+await engineSource();
