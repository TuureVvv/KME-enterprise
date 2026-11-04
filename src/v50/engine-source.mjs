import fs from'node:fs/promises';import{assembledEngine as old}from'../v11/engine-source.mjs';
const extension=await fs.readFile(new URL('expedition.js',import.meta.url),'utf8');
export const assembledEngine=old.replace('const flooded=s.district.id===2&&','const flooded=s.district.id===2&&!s.infrastructure?.done&&').replace('root.KMEBlacksiteEngine={V4_MISSIONS,',extension+'\nroot.KMEBlacksiteEngine={V5_INFRA,activateInfrastructure,buildIdentity,V4_MISSIONS,');
