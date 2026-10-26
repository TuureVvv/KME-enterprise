on(container,'input',e=>{const t=e.target;if(t.hasAttribute('data-bs-haptics'))options.haptics=t.checked;if(t.hasAttribute('data-bs-volume'))options.volume=Number(t.value);if(t.hasAttribute('data-bs-shake'))options.shake=Number(t.value);if(t.hasAttribute('data-bs-quality'))options.quality=t.value;if(t.hasAttribute('data-bs-assist'))options.assist=t.checked;if(t.hasAttribute('data-bs-handed'))options.leftHanded=t.checked;saveOptions();});
on(container,'click',e=>{
  const b=e.target.closest('button');if(!b)return;const has=name=>b.classList.contains(name);
  if(b.dataset.bsDistrict&&!active){const n=Number(b.dataset.bsDistrict);if(n<=progress().unlocked){selectedDistrict=n;s=E.make(7,Infinity,{district:n,protocol:selectedClass,blueprints:progress().blueprints});gfx?.update(s);intro();}return;}
  if(b.dataset.bsClass&&!active){const c=E.PROTOCOLS.find(c=>c.id===b.dataset.bsClass);if(c&&c.unlock<=progress().unlocked){selectedClass=c.id;s=E.make(7,Infinity,{district:selectedDistrict,protocol:selectedClass,blueprints:progress().blueprints});gfx?.update(s);intro();}return;}
  if(b.dataset.bsPerk){if(E.choose(s,b.dataset.bsPerk)){overlay.hidden=true;offerStamp='';clearInput();tone(440,.08);}return;}
  if(has('bs-practice')){practice=true;start();}
  if(has('bs-build'))inspect();if(has('bs-settings'))settings();if(has('bs-options-back'))intro();if(has('bs-map-button'))mapScreen();
  if(has('bs-retreat')&&active)retreat();
  if(has('bs-sound')){options.sound=soundOn;saveOptions();}
  if(has('bs-overtime')){paused=true;clearInput();show('<span class="bs-tag">OPTIONAL OVERTIME CONTRACT</span><h3>Sign your<br>own problem.</h3><p><b>Reward:</b> +35% eligible score within existing caps.</p><p><b>Price:</b> an elite patrol, immediate wave-5 pressure and an eight-second extraction channel.</p><button class="button bs-sign-contract">Sign the terrible contract</button><button class="button secondary bs-resume">Decline / return to field</button>');}
  if(has('bs-sign-contract')){E.contract(s);paused=false;overlay.hidden=true;offerStamp='';clearInput();}
});
function assistAim(){
  if(!options.assist||Math.hypot(aimStick.x,aimStick.z)<=.15)return;
  const p=s.player,n=Math.hypot(input.ax,input.az),target=s.enemies.filter(e=>!e.dead&&e.state!=='burrow'&&Math.hypot(e.x-p.x,e.z-p.z)<22&&((e.x-p.x)*input.ax+(e.z-p.z)*input.az)/(Math.hypot(e.x-p.x,e.z-p.z)*n)>.96&&E.clearLine(s,p.x,p.z,e.x,e.z)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(target){input.ax=target.x-p.x;input.az=target.z-p.z;}
}
function weaponSound(){
  if(!soundOn||options.volume<=0)return;
  const presets={pistol:[190,.07],rifle:[130,.045],shotgun:[78,.14],rivet:[250,.09],arc:[530,.16],prism:[710,.07],mortar:[52,.23],redline:[83,.45],annuity:[660,.32],saw:[115,.25],swarm:[450,.07],planter:[110,.13],rail:[970,.13],flame:[60,.08],stapler:[210,.045]},[frequency,duration]=presets[s.weapon]||presets.pistol;
  tone(frequency,duration);
  try{audio.resume().catch(()=>{});const length=Math.floor(audio.sampleRate*duration),buffer=audio.createBuffer(1,length,audio.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*(1-i/length);const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=s.weapon==='shotgun'?1400:s.weapon==='mortar'?650:2200;gain.gain.value=options.volume*.07;source.connect(filter).connect(gain).connect(audio.destination);source.start();}catch{}
}
