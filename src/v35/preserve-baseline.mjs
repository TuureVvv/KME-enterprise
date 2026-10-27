import fs from 'node:fs/promises';import crypto from 'node:crypto';
const saved='baseline/v3.0/site-files.json';
try{await fs.access(saved);console.log('Preserved v3.0 baseline already exists.');}catch{
 const release=JSON.parse(await fs.readFile('outputs/V3-RELEASE-MANIFEST.json','utf8')),files=[];
 for(const f of release.files.filter(f=>!f.path.includes('/'))){const bytes=await fs.readFile(f.local);if(crypto.createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('v3 baseline differs: '+f.path);await fs.copyFile(f.local,'baseline/v3.0/site/'+f.path);files.push({name:f.path,sha256:f.sha256,bytes:bytes.length});}
 await fs.copyFile('outputs/V3-RELEASE-MANIFEST.json','baseline/v3.0/release-manifest.json');await fs.copyFile('outputs/DEPLOYMENT-v3.0.json','baseline/v3.0/deployment.json');await fs.writeFile(saved,JSON.stringify({commit:'55a67d5812c9b0b9a68589522f3230f9b198b961',files},null,2));console.log('Verified and preserved '+files.length+' v3.0 root release files.');
}
