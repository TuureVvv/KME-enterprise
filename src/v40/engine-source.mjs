import fs from'node:fs/promises';import{assembledEngine as old}from'../v8/engine-source.mjs';
const extension=await fs.readFile(new URL('expedition.js',import.meta.url),'utf8');let source=old;
source=source.replace('root.KMEBlacksiteEngine={cancelCharge,','\n'+extension+'\nroot.KMEBlacksiteEngine={V4_MISSIONS,V4_POOLS,beginTransit,confirmTransit,advanceSector,calibrate,calibrationCost,cancelCharge,');
// District ecology is selected in the actual spawn path, not only in descriptions.
const before="const kinds=s.wave<2?['stalker','rat','skitter']:['stalker','gunner','rat','lancer','insurer','sapper','breacher','spitter','foreman','skitter',...(s.wave>=3?['sniper','bomber']:[]),...(s.district.id>=2?['coil']:[]),...(s.district.id>=3?['surveyor']:[]),...(s.district.id>=4?['reaper','lancer']:[])];";
if(!source.includes(before))throw Error('Ecology anchor');source=source.replace(before,"const kinds=[...V4_POOLS[s.district.id-1],...(s.circuit>1?['insurer','executive','foreman']:[])];");
export const assembledEngine=source;
