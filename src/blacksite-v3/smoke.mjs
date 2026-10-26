import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require('../../scripts/browser-runtime.cjs');
await fs.mkdir('outputs/previews',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.KME_CHROMIUM_EXECUTABLE||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4174/demo.html?game=blacksite');await page.locator('#demo-enter').click();await page.locator('[data-v3="games-only"]').click();await page.locator('#picker [data-character]').first().click();if(await page.locator('#shift-dialog').evaluate(e=>e.open))await page.locator('#shift-dialog [data-close]').click();await page.evaluate(()=>navigate('arena'));
 await page.waitForSelector('.bs-start',{timeout:60000});await page.locator('.bs-stage').screenshot({path:'outputs/previews/v3-deployment-desktop.png'});
 await page.locator('.bs-start').click();await page.waitForFunction(()=>KMEBlacksite.instance.active);await page.waitForTimeout(600);await page.locator('.bs-stage').screenshot({path:'outputs/previews/v3-game-desktop.png'});
 console.log(JSON.stringify({errors,active:await page.evaluate(()=>KMEBlacksite.instance.active),renderer:await page.evaluate(()=>({calls:KMEBlacksite.instance.renderer.info().render.calls,triangles:KMEBlacksite.instance.renderer.info().render.triangles}))}));
 await page.locator('.bs-pause').click();await page.setViewportSize({width:390,height:844});await page.locator('.bs-stage').screenshot({path:'outputs/previews/v3-pause-phone.png'});await page.locator('.bs-resume').click();await page.waitForTimeout(250);await page.locator('.bs-stage').screenshot({path:'outputs/previews/v3-game-phone.png'});
 console.log(JSON.stringify({phoneOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),errors}));
}finally{await browser.close();}
