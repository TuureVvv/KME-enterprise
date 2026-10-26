import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const baseline=JSON.parse(await fs.readFile('baseline/v2.9/site-files.json','utf8'));let preserved=0;
for(const file of baseline.filter(f=>f.path!=='demo.html')){let data=await fs.readFile('outputs/site/'+file.path);if(file.path==='index.html')data=Buffer.from(data.toString('utf8').replace('<div class="pending-local">LOCAL DEVELOPMENT PREVIEW · NOT UPLOADED</div>',''));assert.equal(sha(data),file.sha256,'Unexpected live/baseline change: '+file.path);preserved++;}
const html=await fs.readFile('outputs/site/demo.html','utf8'),engine=await fs.readFile('work/v8/engine.js','utf8');
assert.match(html,/connect-src 'self';/);assert.doesNotMatch(html,/<script src="[^" ]*(?:config\.js|supabase)/);assert.match(html,/<body data-demo="true">/);
assert.doesNotMatch(engine,/overheat\s*:|venting|\bp\.heat\b|\bi\.vent\b/);
const adapter=await fs.readFile('work/v8/demo-session.js','utf8'),controller=await fs.readFile('work/v8/controller.js','utf8');
assert.match(adapter,/repo\.constructor!==DemoRepository/);assert.doesNotMatch(controller,/o\.on(?:Start|Pulse|Finish|Cancel)/);
const manifest=JSON.parse(await fs.readFile('outputs/V3-DEMO-PACKAGE.json','utf8')),standalone=await fs.readFile(manifest.standalone);assert.equal(sha(standalone),manifest.sha256);assert.match(standalone.toString('utf8'),/connect-src 'none'/);
const record={staticCheckedAt:new Date().toISOString(),version:'3.0',status:'local demo only',preservedBaselineWebsiteFiles:preserved,demoAppSHA256:sha(await fs.readFile('outputs/site/demo-app.js')),standalone:manifest,liveRepositoryGuard:true,externalConnectionsBlocked:true,weaponHeatRemoved:true};
await fs.writeFile('outputs/V3-STATIC-VERIFICATION.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({preservedBaselineFiles:preserved,localDemoGuards:'passed',weaponHeatRemoved:true,standaloneFingerprint:'matched',note:'Runtime test evidence is recorded separately; this command performs static verification only.'}));
