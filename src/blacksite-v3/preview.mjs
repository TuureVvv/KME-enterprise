import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve('outputs/site'),port=Number(process.env.KME_DEMO_PORT)||4174;
http.createServer(async(req,res)=>{
 try{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/demo.html';
  const allowed=/^\/(?:demo\.html|demo-app\.js|demo-styles\.css|privacy\.html|styles\.css|offline\.html|patches\.json|assets\/arcade-atlas\.png|icons\/[a-z0-9-]+\.png|vendor\/three-0\.180\.0\.(?:module|core)\.js)$/.test(name);
  if(!allowed){res.writeHead(404);res.end('Local demo assets only.');return;}
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('BLACKSITE v3.0 local demo: http://127.0.0.1:'+port+'/?game=blacksite'));
