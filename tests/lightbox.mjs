import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4322';
const engines=(process.env.LIGHTBOX_QA_ENGINES||'chromium,webkit').split(',');
const output=path.resolve(import.meta.dirname,'output');
const report={base,passed:false,engines:[],apiRequests:0,pageErrors:[]};
const first='/assets/unit-imgOpenInterior1.webp',second='/assets/unit-imgOpenInterior2.webp';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const bounded=promise=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Expected image request did not arrive')),8000);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
let browser;

async function frame(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function state(page){return page.locator('[data-media-image]').evaluate(image=>({src:image.getAttribute('src'),currentSrc:image.currentSrc,alt:image.alt,complete:image.complete,naturalWidth:image.naturalWidth,hidden:image.hidden,caption:document.querySelector('#media-caption').textContent,count:document.querySelector('[data-media-count]').textContent}));}
async function ready(page,count){await page.waitForFunction(count=>{const image=document.querySelector('[data-media-image]');return document.querySelector('[data-media-count]')?.textContent===count&&image?.complete&&image.naturalWidth>1&&!image.hidden;},count,{timeout:15000});}
async function pageFor(context){
 const page=await context.newPage();page.setDefaultTimeout(8000);
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 await page.route('**/api/enquiry',route=>{report.apiRequests++;return route.abort();});
 return page;
}
async function openFirst(page){
 await page.goto(base+'/residences/3402/',{waitUntil:'domcontentloaded',timeout:25000});
 await page.locator('[data-gallery="unit-interiors"]').first().click();
 await ready(page,'1 / 3');
}

try{
 for(const name of engines){
  const launch={headless:true};if(name==='chromium'){launch.args=['--no-sandbox','--disable-dev-shm-usage'];if(process.env.CHROMIUM_EXECUTABLE_PATH)launch.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;}
  browser=await playwright[name].launch(launch);
  const checks=[];
  let context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  let page=await pageFor(context);
  let gate=deferred(),arrived=deferred();
  try{
   await page.route('**'+second,async route=>{arrived.resolve();await gate.promise;await route.continue();});
   await openFirst(page);const before=await state(page);
   await page.locator('[data-media-next]').click();await bounded(arrived.promise);await frame(page);
   const pending=await state(page);
   assert.deepEqual(pending,before,'A pending replacement must retain the displayed photo, caption, alt and counter');
   assert.equal(await page.locator('.media-viewport').getAttribute('aria-busy'),'true');
   await page.locator('[data-media-next]').click();await ready(page,'3 / 3');
   const latest=await state(page);
   const lateResponse=page.waitForResponse(response=>new URL(response.url()).pathname===second);
   gate.resolve();await(await lateResponse).finished();await frame(page);
   assert.deepEqual(await state(page),latest,'A late older image must not replace the latest selected image');
   checks.push('Cold image loading retains the complete old frame; rapid navigation keeps the latest decoded image.');
  }finally{gate.resolve();await context.close();}

  context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  page=await pageFor(context);gate=deferred();arrived=deferred();
  try{
   await page.route('**'+second,async route=>{arrived.resolve();await gate.promise;await route.continue();});
   await openFirst(page);await page.locator('[data-media-next]').click();await bounded(arrived.promise);
   await page.keyboard.press('Escape');await page.locator('#media-dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Open the floor plan viewer',exact:true}).click();await ready(page,'1 / 1');
   const plan=await state(page);
   const lateResponse=page.waitForResponse(response=>new URL(response.url()).pathname===second);
   gate.resolve();await(await lateResponse).finished();await frame(page);
   assert.deepEqual(await state(page),plan,'Closing and reopening another source must invalidate the old gallery request');
   await page.locator('[data-zoom-in]').click();assert.equal(await page.locator('[data-zoom-value]').innerText(),'150%');
   await page.locator('[data-zoom-fit]').click();assert.equal(await page.locator('[data-zoom-value]').innerText(),'100%');
   checks.push('Mobile close/reopen rejects stale results; the newly loaded plan still zooms and fits.');
  }finally{gate.resolve();await context.close();}

  context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page=await pageFor(context);
  try{
   let failFirst=true,failSecond=true;
   await page.route('**'+first,route=>{if(failFirst){failFirst=false;return route.abort('failed');}return route.continue();});
   await page.route('**'+second,route=>{if(failSecond){failSecond=false;return route.abort('failed');}return route.continue();});
   await page.goto(base+'/residences/3402/',{waitUntil:'domcontentloaded',timeout:25000});
   await page.locator('[data-gallery="unit-interiors"]').first().click();
   await page.waitForFunction(()=>document.querySelector('[data-media-status]')?.textContent.includes('could not be loaded'));
   assert.equal((await state(page)).hidden,true,'A failed initial image must not expose a broken frame');
   assert.equal((await state(page)).count,'');
   await page.keyboard.press('Escape');await page.locator('#media-dialog').waitFor({state:'hidden'});
   await page.locator('[data-gallery="unit-interiors"]').first().click();await ready(page,'1 / 3');
   const before=await state(page);await page.locator('[data-media-next]').click();
   await page.waitForFunction(()=>document.querySelector('[data-media-status]')?.textContent.includes('could not be loaded'));
   assert.deepEqual(await state(page),before,'A failed replacement must keep the current photograph and its metadata');
   await page.locator('[data-media-next]').click();await ready(page,'3 / 3');
   await page.locator('[data-media-prev]').click();await ready(page,'2 / 3');
   checks.push('Initial and replacement failures show recovery guidance, retain valid content, and allow skipping or retrying the failed image.');
  }finally{await context.close();}
  report.engines.push({name,checks});await browser.close();browser=null;
 }
 assert.equal(report.apiRequests,0,'No enquiry was submitted');assert.deepEqual(report.pageErrors,[]);report.passed=true;
}catch(error){report.error=error.stack||String(error);process.exitCode=1;}
finally{if(browser)await browser.close();await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'lightbox-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
