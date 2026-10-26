/* BLACKSITE v3.0 — local-demo campaign data. No network or health records. */
(function (root) {
  'use strict';
  const districts = [
    { id: 1, name: 'Mossline Yard', subtitle: 'The company left. Something clocked in.',
      terrain: 'yard', guardian: 'mole', difficulty: 1, accent: '#c7ee8a', ground: 0x293b36, fog: 0x172d31, wall: 0x617a71,
      objective: 'Restore the relay network. Find what is moving beneath the yard.',
      rule: 'Burrow warnings lock before impact. Dash out after the ring turns orange.',
      unlock: 'Boiler Rifle · Chain Lightning', shifts: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]] },
    { id: 2, name: 'The Drowned Works', subtitle: 'Nothing here passed the water inspection.',
      terrain: 'foundry', guardian: 'sludge', difficulty: 1.45, accent: '#81e6da', ground: 0x263f43, fog: 0x16323b, wall: 0x467a7f,
      objective: 'Recover the flood controls. Contain the Director of Waste.',
      rule: 'Drain surges mark the ground before discharging. Coil drones fire in crosses.',
      unlock: 'Arc Fork · Cryo Rounds', shifts: [[0,0],[1,-4],[-2,3],[4,-1],[-2,2],[1,0],[0,-3],[0,4]] },
    { id: 3, name: 'Violet Archives', subtitle: 'Your complaint has been permanently filed.',
      terrain: 'archive', guardian: 'archer', difficulty: 1.95, accent: '#d0b4ff', ground: 0x393345, fog: 0x29243a, wall: 0x756780,
      objective: 'Reconnect the archive pylons. Revoke the Archer’s access.',
      rule: 'Surveyors mark lanes before firing piercing volleys. Break their line of sight.',
      unlock: 'Prism Carbine · Orbital Rats', shifts: [[0,0],[-1,3],[2,0],[1,2],[-3,-2],[-1,-2],[1,4],[-1,-4]] },
    { id: 4, name: 'Executive Blackout', subtitle: 'The board requests your immediate termination.',
      terrain: 'blackout', guardian: 'potency', difficulty: 2.65, accent: '#ffb18c', ground: 0x3d3431, fog: 0x31262c, wall: 0x826653,
      objective: 'Bring emergency power online. Survive Mr. Potency’s exit interview.',
      rule: 'The cannon armour opens during reload. Parry the volley, then commit.',
      unlock: 'All districts · Endless overtime', shifts: [[0,0],[0,-3],[1,-1],[-2,2],[1,1],[0,1],[0,-2],[0,2]] }
  ];
  const palettes=[
 {ground:0x575257,fog:0x28323f,wall:0x7d8896,road:0x343b49,roof:0x3e4b60,interior:0xa58d6c,paint:[0x7d8ea1,0xbc805c,0x698eb0,0xa77c91,0xb69b64,0x8c7bb3,0x6d9b99,0xb58c67]},
 {ground:0x425361,fog:0x1f3248,wall:0x7891a6,road:0x293a50,roof:0x324e69,interior:0x96785e,paint:[0x809aae,0xbe8d60,0x4d8ea8,0x8b819c,0xb7825e,0x6579a5,0x6c9d9c,0xa48b70]},
 {ground:0x57546a,fog:0x302d47,wall:0x9a8caf,road:0x34374e,roof:0x4e4567,interior:0xa59b88,paint:[0x9d99b3,0xbd986d,0x638bab,0xa578a1,0x8b91ad,0xa07eb8,0x709ba5,0xa68b72]},
 {ground:0x51474c,fog:0x322b3a,wall:0xa78c82,road:0x303641,roof:0x444456,interior:0x9b7460,paint:[0x929ba8,0xc37c5d,0x728fa5,0x9c7b9b,0xb59a70,0xb77979,0x638e9e,0xbc895d]}
 ];districts.forEach((d,i)=>Object.assign(d,palettes[i],{palette:palettes[i]}));
  const protocols = [
    { id: 'intern', name: 'UNPAID INTERN', role: 'FLEXIBLE STARTER', icon:'✦', ability:'PANIC BUTTON', passive:'Choose from four field requisitions instead of three.', description:'Emergency pulse staggers nearby enemies and reflects shots. Build whatever HR fears most.', drawback:'No specialist armour or automated backup.', hp:100, stamina:110, scrap:130, dash:.8, armor:1, cooldown:12, unlock:1 },
    { id: 'enforcer', name: 'UNION ENFORCER', role: 'FRONTLINE', icon:'⬡', ability:'UNION SHIELD', passive:'A perfectly timed frontal block empowers the next volley.', description:'Raise a directional shield, then shove enemies away when it ends.', drawback:'Moves slowly and cannot shoot while shielding. Flanks and ground hazards still hurt.', hp:125, stamina:100, scrap:110, dash:.95, armor:1, cooldown:10, unlock:1 },
    { id: 'engineer', name: 'RAT ENGINEER', role: 'FIELD AUTOMATION', icon:'⚙', ability:'RAT SENTRY', passive:'Nearby kills salvage extra scrap. Sentry inherits electric and cryo features.', description:'Deploy or reposition one temporary rat-operated turret. Safety certificate not included.', drawback:'85 health. Your machinery needs good lines of sight.', hp:85, stamina:100, scrap:155, dash:.9, armor:1, cooldown:16, unlock:1 },
    { id: 'chemist', name: 'LIABILITY CHEMIST', role: 'ELEMENTAL SETUP', icon:'⚗', ability:'UNLABELLED FLASK', passive:'Cryo/plasma shatter hits harder. Flask follows your equipped elemental features.', description:'Throw a fictional combat chemical pool. Freeze, conduct or burn a choke point.', drawback:'90 health. Enemies can escape a poorly placed pool.', hp:90, stamina:100, scrap:135, dash:.85, armor:1, cooldown:13, unlock:2 }
  ];
  const perks = {
    power: { name: 'PERFORMANCE REVIEW', icon: '↗', description: '+18% weapon damage. Management has noticed the damage.', stat: 'DAMAGE +18%' },
    rapid: { name: 'HOSTILE PRODUCTIVITY', icon: '»', description: '+15% fire rate. No overheating. No mandatory breaks.', stat: 'FIRE RATE +15%' },
    vitality: { name: 'EXTENDED BENEFITS', icon: '✚', description: '+25 maximum health and heal 35 immediately.', stat: 'MAX HEALTH +25' },
    recovery: { name: 'SECOND WIND', icon: 'ϟ', description: '+35% stamina regeneration. Dash, parry, repeat.', stat: 'STAMINA REGEN +35%' },
    pierce: { name: 'PAPERWORK PENETRATION', icon: '⌁', description: 'Every projectile pierces one more enemy. Yes, shotgun pellets too.', stat: 'PROJECTILE PIERCE +1' },
    salvage: { name: 'CREATIVE ACCOUNTING', icon: '◇', description: '+35% locker and scrap pickup value.', stat: 'SCAVENGING +35%' },
    dashwake: { name: 'EXIT VELOCITY', icon: '↯', description: 'Dashing emits a close-range shockwave that damages and slows.', stat: 'DASH SHOCKWAVE' },
    conductor: { name: 'UNION ORGANIZER', icon: '⌘', description: 'Chain Lightning jumps to two additional targets.', stat: 'LIGHTNING JUMPS +2' }
  };
  root.KMEBlacksiteCampaign = { districts, protocols, perks };
})(window);
