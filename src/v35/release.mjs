import fs from'node:fs/promises';import crypto from'node:crypto';
const root='outputs/site',build=JSON.parse(await fs.readFile('outputs/V35-BUILD.json','utf8')),names=['index.html','demo.html','app.js','demo-app.js','styles.css','demo-styles.css','patches.json','sw.js','privacy.html','manifest.webmanifest'],files=names.map(n=>({path:n,local:root+'/'+n}));
for(const n of(await fs.readdir('work/v9')).filter(n=>/\.(js|css|html|mjs|md|sql)$/.test(n)))files.push({local:'work/v9/'+n,path:'src/v35/'+n});
for(const n of await fs.readdir('work/v9/supabase/migrations'))files.push({local:'work/v9/supabase/migrations/'+n,path:'supabase/migrations/'+n});files.push({local:'work/v9/PATCH.md',path:'PATCH-v3.5.md'});
for(const f of files){const data=await fs.readFile(f.local),text=data.toString('utf8');if(/sb_secret_[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(text))throw Error('Private key marker '+f.path);f.bytes=data.length;f.sha256=crypto.createHash('sha256').update(data).digest('hex');f.blob=crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');}
if(new Set(files.map(f=>f.path)).size!==files.length)throw Error('Duplicate release path');
await fs.writeFile('outputs/V35-RELEASE-MANIFEST.json',JSON.stringify({...build,files},null,2)+'\n');console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),published:false}));
