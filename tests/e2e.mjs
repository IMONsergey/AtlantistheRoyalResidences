import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright');
let launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
if(process.env.CHROMIUM_EXECUTABLE_PATH)launch.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch(launch);
const base=process.env.TEST_BASE_URL||'http://localhost:4322';
const output=path.resolve(import.meta.dirname,'output');await fs.mkdir(output,{recursive:true});
const results=[];
const faults=[];
async function snapshot(page,name){await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});}
async function noHorizontalOverflow(page,label='page'){
 const box=await page.evaluate(()=>({viewport:innerWidth,client:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 assert.ok(box.document<=box.client+1&&box.body<=box.client+1,`${label}: horizontal overflow ${JSON.stringify(box)}`);
 return box;
}
async function sliderCount(page,selector,value){
 await page.waitForFunction(({selector,value})=>document.querySelector(`${selector} [data-slider-count]`)?.textContent?.trim()===value,{selector,value});
}
async function mediaReady(page){
 await page.waitForFunction(()=>{const image=document.querySelector('[data-media-image]');return image&&!image.hidden&&image.complete&&image.naturalWidth>1&&document.querySelector('.media-viewport')?.getAttribute('aria-busy')!=='true';});
}
async function checkImages(page){
 await page.evaluate(async()=>{const images=[...document.images].filter(img=>img.getAttribute('src')||img.getAttribute('srcset'));images.forEach(img=>img.loading='eager');await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));});
 const broken=await page.evaluate(()=>[...document.images].filter(img=>(img.getAttribute('src')||img.getAttribute('srcset'))&&(!img.complete||img.naturalWidth===0)).map(img=>img.currentSrc||img.getAttribute('src')));
 assert.deepEqual(broken,[],'Every referenced image must load');
}
function watch(page){page.on('pageerror',error=>faults.push(error.message));page.on('response',response=>{if(response.status()>=400&&!response.url().includes('/api/enquiry'))faults.push(`${response.status()} ${response.url()}`);});}
try{
 const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await desktop.newPage();watch(page);
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await checkImages(page);assert.match(await page.title(),/Atlantis/);
 assert.equal(await page.locator('main h1').count(),1);await noHorizontalOverflow(page,'desktop');assert.equal(await page.locator('.pin-spacer').count(),0);await snapshot(page,'desktop-hero');
 const scrollTargets=[['.origin-opening','desktop-origin'],['.reside-composition','desktop-collage'],['#location','desktop-location'],['.ascent','desktop-ascent'],['#highlights','desktop-highlights'],['.residences-opening','desktop-residences'],['#plans','desktop-catalogue'],['#interiors','desktop-interiors'],['.closing','desktop-closing']];
 for(const [selector,name]of scrollTargets){await page.locator(selector).evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY));await page.waitForTimeout(120);await snapshot(page,name);}
 await page.locator('#highlights').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Next highlight'}).click();await sliderCount(page,'#highlights','2 / 3');assert.match(await page.locator('#highlights [data-slide]:not([hidden]) h3').innerText(),/Beyond/i);await snapshot(page,'desktop-highlight-pool');await page.getByRole('button',{name:'Next highlight'}).click();await sliderCount(page,'#highlights','3 / 3');assert.match(await page.locator('#highlights [data-slide]:not([hidden]) h3').innerText(),/boundless/i);await snapshot(page,'desktop-highlight-beach');
 await page.locator('#bedroom-filter').selectOption('2');assert.equal(await page.locator('[data-no-results]').isVisible(),true);await page.getByRole('button',{name:'Reset filters',exact:true}).first().click();await page.locator('[data-unit-result]').waitFor({state:'visible'});await page.getByRole('button',{name:'Interior',exact:true}).click();assert.equal(await page.locator('[data-interior-preview]').isVisible(),true);await page.getByRole('button',{name:'Floor plan',exact:true}).click();
 await page.locator('#interiors').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Next interior'}).click();await sliderCount(page,'#interiors','2 / 3');assert.equal(await page.locator('#interiors [data-slider-count]').innerText(),'2 / 3');await page.locator('#interiors [data-slide]:not([hidden]) button').click();assert.equal(await page.locator('#media-dialog').isVisible(),true);await page.getByRole('button',{name:'Next image',exact:true}).click();await mediaReady(page);assert.equal(await page.locator('[data-media-count]').innerText(),'3 / 3');await page.keyboard.press('Escape');
 await page.locator('#bedroom-filter').selectOption('4');await page.locator('#area-filter').selectOption('300-plus');await page.locator('.unit-row').click();await page.waitForURL(/\/residences\/3402\/(?:\?.*)?$/);await checkImages(page);assert.match(await page.locator('h1').innerText(),/3402/);await snapshot(page,'desktop-unit');await page.getByRole('link',{name:'Return to residences',exact:true}).click();await page.waitForURL(/\/\?bedrooms=4&area=300-plus#plans$/);assert.equal(await page.locator('#bedroom-filter').inputValue(),'4');assert.equal(await page.locator('#area-filter').inputValue(),'300-plus');await page.locator('.unit-row').click();await page.waitForURL(/\/residences\/3402\/(?:\?.*)?$/);
 await page.getByRole('button',{name:'Open the floor plan viewer'}).click();await mediaReady(page);await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert.equal(await page.locator('[data-zoom-value]').innerText(),'200%');await snapshot(page,'desktop-plan-zoom');await page.getByRole('button',{name:'Fit plan'}).click();assert.equal(await page.locator('[data-zoom-value]').innerText(),'100%');await page.keyboard.press('Escape');
 const payloads=[];let attempts=0;
 await page.route('**/api/enquiry',async route=>{payloads.push(route.request().postDataJSON());attempts++;if(attempts===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporarily unavailable. Please try again.'})});if(attempts===2)return route.abort('connectionfailed');return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:route.request().postDataJSON().submissionId})});});
 await page.getByRole('button',{name:'Register your interest',exact:true}).click();await page.getByRole('button',{name:'Send enquiry',exact:true}).click();assert.equal(await page.locator('[aria-invalid="true"]').count(),3);await snapshot(page,'desktop-form-validation');await page.getByLabel('Full name',{exact:true}).fill('QA Residence Buyer');await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Phone (optional)',{exact:true}).fill('+971 50 123 4567');await page.getByLabel('I agree to be contacted about this enquiry.').check();
 await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-form-message]').hidden);assert.equal(await page.locator('[data-form-success]').isVisible(),false);await snapshot(page,'desktop-form-error');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Register your interest',exact:true}).click();assert.equal(await page.getByLabel('Full name',{exact:true}).inputValue(),'QA Residence Buyer');assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'qa@example.invalid');
 await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-form-message]').textContent.includes('Connection'));assert.equal(await page.locator('[data-form-success]').isVisible(),false);
 await page.setViewportSize({width:844,height:390});
 await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await page.locator('[data-form-success]').waitFor({state:'visible'});assert.equal(payloads.length,3);assert.equal(new Set(payloads.map(p=>p.submissionId)).size,1);assert.equal(payloads[0].project,'atlantis');assert.equal(payloads[0].context,'Unit 3402 interest');assert.equal(payloads[0].consent,true);assert.equal(typeof payloads[0].startedAt,'number');
 const successView=await page.locator('[data-form-success]').evaluate(element=>{const scroller=element.closest('[data-dialog-scroll]');return{scrollTop:scroller.scrollTop,scrollTopEdge:scroller.getBoundingClientRect().top,headingTop:element.querySelector('h2').getBoundingClientRect().top};});
 assert.ok(successView.scrollTop===0&&successView.headingTop>=successView.scrollTopEdge,`Success heading must be readable after a scrolled form: ${JSON.stringify(successView)}`);
 await snapshot(page,'landscape-form-success');await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:900});
 await page.goto(base+'/privacy/',{waitUntil:'networkidle'});assert.match(await page.locator('h1').innerText(),/Privacy/i);await desktop.close();results.push('Desktop: source images, sections, filters, three-slide galleries, unit navigation, plan zoom and real request state handling passed.');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});const phone=await mobile.newPage();watch(phone);await phone.goto(base,{waitUntil:'networkidle'});await phone.evaluate(()=>document.fonts.ready);await checkImages(phone);await noHorizontalOverflow(phone,'mobile');await snapshot(phone,'mobile-hero');
 await phone.getByRole('button',{name:'Open navigation'}).click();assert.equal(await phone.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await snapshot(phone,'mobile-menu');await phone.locator('#site-menu').getByRole('button',{name:'Register your interest'}).click();await phone.locator('#enquiry-dialog').waitFor({state:'visible'});await phone.keyboard.press('Escape');assert.equal(await phone.evaluate(()=>document.activeElement?.classList.contains('menu-toggle')),true);await phone.getByRole('button',{name:'Open navigation'}).click();await phone.locator('#site-menu').getByRole('link',{name:'04 Plans'}).click();assert.equal(await phone.locator('#site-menu').isVisible(),false);await phone.waitForTimeout(100);assert.equal(await phone.locator('#plans').isVisible(),true);
 for(const[selector,name]of [['.myth','mobile-myth'],['.reside-copy','mobile-origin'],['.ascent','mobile-ascent'],['#highlights','mobile-highlights'],['.residences-opening','mobile-residences'],['#plans','mobile-catalogue'],['#interiors','mobile-interiors'],['#contacts','mobile-contacts']]){await phone.locator(selector).scrollIntoViewIfNeeded();await snapshot(phone,name);}
 await phone.locator('#highlights').scrollIntoViewIfNeeded();await phone.getByRole('button',{name:'Next highlight'}).click();await sliderCount(phone,'#highlights','2 / 3');assert.match(await phone.locator('#highlights [data-slide]:not([hidden]) h3').innerText(),/Beyond/i);
 await phone.locator('#area-filter').selectOption('under-300');assert.equal(await phone.locator('[data-no-results]').isVisible(),true);await phone.locator('#residence-filters button').click();await phone.locator('.unit-row').click();await phone.waitForURL(/\/residences\/3402\/(?:\?.*)?$/);await noHorizontalOverflow(phone,'mobile');await checkImages(phone);await snapshot(phone,'mobile-unit');await phone.screenshot({path:path.join(output,'mobile-unit-full.png'),fullPage:true});
 await phone.getByRole('button',{name:'Open the floor plan viewer'}).click();await mediaReady(phone);await phone.getByRole('button',{name:'Zoom in',exact:true}).click();assert.equal(await phone.locator('[data-zoom-value]').innerText(),'150%');await phone.getByRole('button',{name:'Close image'}).click();await phone.getByRole('button',{name:'Request payment plan',exact:true}).click();await phone.getByRole('button',{name:'Send enquiry',exact:true}).click();assert.equal(await phone.locator('[aria-invalid="true"]').count(),3);await snapshot(phone,'mobile-form');await phone.keyboard.press('Escape');await mobile.close();results.push('Mobile 390px: navigation, anchors, layouts without overflow, carousel controls, filters, full detail, plan zoom and form validation passed.');
 const motionContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const motionPage=await motionContext.newPage();watch(motionPage);
 await motionPage.goto(base,{waitUntil:'networkidle'});await motionPage.evaluate(()=>document.fonts.ready);
 await motionPage.waitForFunction(()=>document.querySelectorAll('.pin-spacer').length>0);
 await motionPage.locator('.ascent').scrollIntoViewIfNeeded();await motionPage.waitForTimeout(800);
 await noHorizontalOverflow(motionPage,'normal-motion desktop');await snapshot(motionPage,'desktop-motion-ascent');
 // A short desktop window must expose the lower introduction copy before pinning it.
 await motionPage.setViewportSize({width:1440,height:650});await motionPage.waitForTimeout(350);
 await motionPage.locator('.residences-opening').evaluate(element=>window.scrollTo({top:element.getBoundingClientRect().bottom+scrollY-innerHeight-4,behavior:'instant'}));
 await motionPage.waitForTimeout(700);
 const beforePin=await motionPage.locator('.residences-description').evaluate(element=>{const r=element.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:innerHeight,opacity:Number(getComputedStyle(element.closest('.residences-heading')).opacity)};});
 assert.ok(beforePin.top>=-1&&beforePin.bottom<=beforePin.height+1&&beforePin.opacity>.98,`Lower intro copy is unreadable before pin: ${JSON.stringify(beforePin)}`);
 await motionPage.evaluate(()=>scrollBy({top:200,behavior:'instant'}));
 await motionPage.setViewportSize({width:390,height:844});
 await motionPage.waitForFunction(()=>document.querySelectorAll('.pin-spacer').length===0);
 await motionPage.locator('.residences-opening').scrollIntoViewIfNeeded();
 await motionPage.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.residences-heading')).opacity)>.98);
 await noHorizontalOverflow(motionPage,'desktop-to-mobile resize');
 const mobileCopy=await motionPage.locator('.residences-heading').evaluate(element=>{const title=element.querySelector('h2').getBoundingClientRect(),copy=element.querySelector('.residences-description').getBoundingClientRect();return{titleBottom:title.bottom,copyTop:copy.top,copyBottom:copy.bottom,viewport:innerHeight};});
 assert.ok(mobileCopy.copyTop>=mobileCopy.titleBottom&&mobileCopy.copyBottom<=mobileCopy.viewport+1,`Mobile intro overlap: ${JSON.stringify(mobileCopy)}`);
 const motionGallery=motionPage.locator('#interiors');await motionGallery.scrollIntoViewIfNeeded();await motionGallery.focus();
 await motionPage.keyboard.press('ArrowRight');await sliderCount(motionPage,'#interiors','2 / 3');
 // Changing the preference during a crossfade must retain the image and reading position.
 const readingTop=await motionGallery.evaluate(element=>element.getBoundingClientRect().top);
 await motionPage.emulateMedia({reducedMotion:'reduce'});
 await motionPage.waitForFunction(()=>document.querySelectorAll('#interiors [data-slide]:not([hidden])').length===1);
 await motionPage.waitForTimeout(600);
 const reducedTop=await motionGallery.evaluate(element=>element.getBoundingClientRect().top);
 assert.ok(Math.abs(reducedTop-readingTop)<2,`Motion change moved the gallery out of the reading viewport: ${readingTop} -> ${reducedTop}`);
 assert.equal(await motionPage.locator('#interiors [data-slide]').evaluateAll(slides=>slides.every(slide=>slide.inert===slide.hidden&&slide.getAttribute('aria-hidden')===String(slide.hidden))),true,'Only the selected gallery slide is interactive');
 await motionPage.keyboard.press('ArrowLeft');await sliderCount(motionPage,'#interiors','1 / 3');
 await motionPage.setViewportSize({width:1440,height:900});
 assert.equal(await motionPage.locator('.pin-spacer').count(),0,'Reduced motion must stay unpinned after resize');
 await noHorizontalOverflow(motionPage,'reduced-motion desktop resize');
 await snapshot(motionPage,'motion-resize-reduced');
 // A classic scrollbar makes the 320px card narrower than touch emulation does.
 for(const width of [320,360,390]){
  await motionPage.setViewportSize({width,height:740});
  await motionPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const area=await motionPage.locator('.unit-summary dl').evaluate(element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,values:[...element.querySelectorAll('dt,dd')].map(value=>{const v=value.getBoundingClientRect();return{text:value.textContent,left:v.left,right:v.right};})};});
  assert.ok(area.values.every(value=>value.left>=area.left&&value.right<=area.right),`Catalogue area text is clipped at ${width}px: ${JSON.stringify(area)}`);
 }
 await motionContext.close();
 results.push('Normal-motion short-desktop pin entry, desktop/mobile resize, keyboard gallery, inert states, live reduced-motion changes with preserved reading position and unclipped 320/360/390px catalogue values passed without page errors.');
 assert.deepEqual(faults,[],'No unexpected page errors or missing resource responses');
 const report={passed:true,results,faults,viewports:[{width:1440,height:900},{width:390,height:844}],notes:['Enquiry responses are deliberately mocked only in this automated test; production UI requires an actual successful API response.','No real enquiry was sent by these tests.']};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
