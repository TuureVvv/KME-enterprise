import fs from'node:fs/promises';
let source=await fs.readFile(new URL('../v8/studio.js',import.meta.url),'utf8');
function patch(a,b){if(source.split(a).length!==2)throw Error('Studio anchor '+a.slice(0,70));source=source.replace(a,()=>b);}
patch("opacity=1,layer=0,zoom=1","opacity=1,smoothing=0,rawPoint=null,layer=0,zoom=1");
patch('<label>OPACITY <output class="studio-opacity-label">','<label>SMOOTHING <output class="studio-smoothing-label">Off</output><input class="studio-smoothing" type="range" min="0" max="100" step="1" value="0" aria-label="Brush smoothing; zero is off"></label><label>OPACITY <output class="studio-opacity-label">');
patch('version:3,layerInfo:','version:4,smoothing,layerInfo:');
patch('function finishPointer(e){if(active?.id!==e.pointerId)return;active=null;',"function finishPointer(e){if(active?.id!==e.pointerId)return;if(e.type==='pointerup'&&smoothing>0&&rawPoint&&last&&['brush','pencil','eraser'].includes(tool)){stroke(last,rawPoint,rawPoint.pressure);last=rawPoint;}rawPoint=null;active=null;");
patch('const point=position(e);cursor=point;',"const point=position(e);rawPoint=point;cursor=point;");
patch('const point=position(ev);if(tool===\'move\')',"const raw=position(ev);rawPoint=raw;const point=['brush','pencil','eraser'].includes(tool)?root.KMEV4.smooth(last,raw,smoothing):raw;if(tool==='move')");
patch("on($('.studio-colour'),'input'", "on($('.studio-smoothing'),'input',e=>{smoothing=Number(e.target.value);$('.studio-smoothing-label').textContent=smoothing?smoothing+'%':'Off';mark(false);});\non($('.studio-colour'),'input'");
patch('unlimitedActions:true,opacity,layer,','unlimitedActions:true,opacity,smoothing,layer,');
patch('id=data.id;prompt=data.prompt;receipt=data.receipt;',"id=data.id;prompt=data.prompt;receipt=data.receipt;smoothing=Math.max(0,Math.min(100,Number(data.smoothing)||0));$('.studio-smoothing').value=String(smoothing);$('.studio-smoothing-label').textContent=smoothing?smoothing+'%':'Off';");
export default source;
