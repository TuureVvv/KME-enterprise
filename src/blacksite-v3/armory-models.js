/* Procedural silhouettes: faction and role are visible without reading a name. */
function specialActor(kind,parent){
 const isRat=['rat','skitter','ambientRat','allyRat'].includes(kind),isNew=!!E.NEW_ENEMIES[kind];if(!isRat&&!isNew)return null;
 const g=new T.Group();parent.add(g);const u=g.userData={kind,legs:[],arms:[]};
 if(isRat){const hostile=kind==='rat'||kind==='skitter',color=hostile?0x763e42:kind==='allyRat'?0xb3cca0:0xbcad8b;
  mesh(g,'ico',color,0,.35,0,.4,.3,.64);const nose=mesh(g,'cone',hostile?0xe79984:0xd9bca2,0,.36,.6,.18,.5,.18);nose.rotation.x=Math.PI/2;
  for(const x of[-.24,.24]){mesh(g,'round',hostile?0xb35562:0xe1c0b1,x,.65,.23,.17,.17,.08);mesh(g,'round',hostile?0xff504f:0x172e26,x*.6,.46,.63,.065,.06,.03,hostile);for(const z of[-.36,.35])mesh(g,'box',0x3a3331,x,.11,z,.16,.18,.24);}
  mesh(g,'cyl',hostile?0x923e51:0xc7a79d,0,.2,-.82,.035,.9,.035).rotation.x=Math.PI/2;
  if(hostile){for(const z of[-.25,.05,.35])mesh(g,'cone',0xd4ab97,0,.67,z,.1,.32,.1);const warning=mesh(g,'cone',0xff5c59,0,.055,0,.85,.025,.85,true);warning.rotation.y=Math.PI;g.scale.setScalar(kind==='skitter'?1.3:1.05);}
  else{mesh(g,'cyl',kind==='allyRat'?0x9ee2af:0xd6b75e,0,.69,0,.38,.12,.38);mesh(g,'box',0x75d8b0,0,.44,-.42,.38,.14,.1,true);g.scale.setScalar(.75);}return g;
 }
 if(kind==='rig'){
  mesh(g,'box',0x6c5c42,0,.8,0,2.3,1.1,3);mesh(g,'box',0xc69c50,0,1.45,-.2,2.1,.55,2.1);mesh(g,'box',0x243e40,0,2.15,-.2,1.6,1.1,1.3);mesh(g,'box',0x79b5b9,0,2.23,.49,1.4,.65,.04,true,.6);
  for(const side of[-1,1]){for(const z of[-.9,1])mesh(g,'cyl',0x222b2c,side*1.18,.55,z,.55,.4,.55).rotation.z=Math.PI/2;mesh(g,'box',0xdbc182,side*.75,1.45,1.5,.2,2.8,.2);mesh(g,'box',0x9c9b88,side*.75,.28,2.4,.28,.18,2);mesh(g,'round',0xff5b50,side*.83,1.6,1,.14,.12,.08,true);}
  mesh(g,'cyl',0xff8b58,0,2.93,-.4,.2,.3,.2,true);u.weak=mesh(g,'ico',0xb7efbd,0,1,-1.6,.45,.45,.2,true);return g;
 }
 if(kind==='stamp'){
  for(const side of[-1,1]){mesh(g,'box',0x384d53,side*1.15,.6,0,.7,1.2,1.9);mesh(g,'cyl',0xb7a27b,side*.95,1.6,0,.22,2.2,.22);mesh(g,'box',0x9d8a6b,side*1.1,2,.1,.7,1.2,.7);}
  mesh(g,'box',0x746282,0,2.6,0,2.9,1,1.7);mesh(g,'cyl',0xc1b594,0,1.7,1.1,.32,2,.32);u.stamp=mesh(g,'box',0xff9e7d,0,.6,1.1,2.7,.4,2.2);mesh(g,'box',0x344956,0,3.35,0,1.6,.55,.7);for(const x of[-.4,0,.4])mesh(g,'box',0xffa484,x,3.38,.37,.17,.12,.03,true);u.weak=mesh(g,'ico',0xa4eac4,0,2,-.9,.45,.5,.25,true);return g;
 }
 const colors={insurer:0x7ba6cb,sapper:0xbca45d,breacher:0xa9846f,spitter:0x8aaf69,foreman:0xc58d60},c=colors[kind];
 mesh(g,'box',0x273b38,0,1,0,.75,1,.55);mesh(g,'ico',c,0,1.15,0,.53,.6,.4);mesh(g,'round',0xa8b398,0,1.9,0,.35,.34,.32);
 for(const side of[-1,1]){const leg=new T.Group();g.add(leg);leg.position.set(side*.25,.55,0);mesh(leg,'box',0x304640,0,-.2,0,.26,.55,.3);mesh(leg,'box',0x1d302b,0,-.45,.12,.35,.22,.5);u.legs.push(leg);mesh(g,'cyl',c,side*.58,1.25,.05,.15,.8,.15);mesh(g,'box',0x455852,side*.58,.83,.15,.3,.24,.32);mesh(g,'box',c,side*.52,1.6,.03,.42,.25,.6);mesh(g,'round',0xff8171,side*.14,1.95,.3,.07,.045,.03,true);}
 ring(g,0,0,.8,0xdf7167,.04,.65);
 if(kind==='insurer'){for(const x of[-.45,.45])mesh(g,'cyl',0x71c7df,x,1.3,-.45,.18,1.1,.18,true);ring(g,0,0,1.1,0x77d8ef,1.3,.5);mesh(g,'box',0x405d7e,.6,1.25,.45,.7,.9,.14);}
 if(kind==='sapper'){mesh(g,'box',0xb3a66c,0,1.2,-.5,.85,.9,.5);for(const x of[-.25,.25])mesh(g,'cyl',0xe26d54,x,1.3,-.8,.14,.65,.14);mesh(g,'cyl',0xdfc06d,0,2.15,0,.45,.15,.45);mesh(g,'round',0xffe9ae,0,2.16,.4,.12,.12,.04,true);}
 if(kind==='breacher'){g.scale.setScalar(1.35);mesh(g,'box',0x7b6d60,0,1.3,.38,.9,.85,.25);mesh(g,'box',0x3d4b4a,.75,1, .7,.12,1.7,.12);mesh(g,'box',0xbb9e79,.75,1.85,.7,.9,.5,.6);mesh(g,'box',0x292f2e,0,1.95,.31,.6,.25,.15);}
 if(kind==='spitter'){for(const x of[-.35,.35])mesh(g,'cyl',0xa3d46b,x,1.3,-.5,.23,1.2,.23,true);mesh(g,'round',0x273b32,0,1.81,.4,.27,.2,.14);mesh(g,'cyl',0x61704b,.5,1.25,.5,.18,.9,.18).rotation.x=Math.PI/2;}
 if(kind==='foreman'){mesh(g,'cyl',0xeeaa5f,0,2.2,0,.45,.2,.45);mesh(g,'box',0xd8af71,0,1.3,.42,.3,.6,.06);mesh(g,'cone',0xeacb94,.7,1.5,.35,.32,.6,.32).rotation.x=Math.PI/2;mesh(g,'box',0x714f42,0,1.3,-.55,.7,.85,.3);}
 return g;
}
