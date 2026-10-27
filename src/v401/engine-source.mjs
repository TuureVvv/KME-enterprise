import{assembledEngine as old}from'../v10/engine-source.mjs';
const before="const boss=spawn(s,s.district.guardian,0,-24),hp={mole:650,sludge:2500,archer:1200,potency:35,revenge:3600}[boss.kind]*threat(s);";
const after="const boss=spawn(s,s.district.guardian,0,-24),override={mole:650,sludge:2500,archer:1200,potency:35,revenge:3600}[boss.kind],hp=override===undefined?boss.maxHp:override*threat(s);";
if(old.split(before).length!==2)throw Error('Guardian health assembly anchor');
// Newly promoted guardians keep the finite, difficulty-scaled health assigned by spawn.
export const assembledEngine=old.replace(before,after);
