import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = <T extends Element=HTMLElement>(selector:string, scope:ParentNode=document) => scope.querySelector<T>(selector);
const $$ = <T extends Element=HTMLElement>(selector:string, scope:ParentNode=document) => [...scope.querySelectorAll<T>(selector)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialogs = $$<HTMLDialogElement>('dialog');
let lastFocus: HTMLElement|null = null;

function syncScrollLock(){document.body.classList.toggle('has-dialog',dialogs.some(dialog=>dialog.open));}
function resetDialogScroll(dialog:HTMLDialogElement){dialog.querySelectorAll<HTMLElement>('[data-dialog-scroll]').forEach(scroller=>{scroller.scrollTop=0;});}
function openDialog(dialog:HTMLDialogElement,trigger?:HTMLElement){
  const origin=trigger||document.activeElement as HTMLElement;
  const parentDialog=origin?.closest('dialog[open]');
  // Menu-to-enquiry transitions return to the visible menu button, not a hidden menu item.
  if(!parentDialog||parentDialog===dialog)lastFocus=origin;
  dialogs.forEach(other=>{if(other!==dialog&&other.open)other.close();});
  if(!dialog.open){
    dialog.showModal();
    // Begin a new dialog view at its heading without changing form or request state.
    resetDialogScroll(dialog);
  }
  syncScrollLock();
}
dialogs.forEach(dialog=>{
  $$<HTMLButtonElement>('[data-close]',dialog).forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('close',()=>{syncScrollLock(); if(!dialogs.some(d=>d.open)) lastFocus?.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
});

const menu=$<HTMLDialogElement>('#site-menu');
const menuToggle=$<HTMLButtonElement>('.menu-toggle');
if(menu&&menuToggle){
  menuToggle.addEventListener('click',()=>{menuToggle.setAttribute('aria-expanded','true');openDialog(menu,menuToggle);});
  menu.addEventListener('close',()=>menuToggle.setAttribute('aria-expanded','false'));
  $$<HTMLAnchorElement>('nav a',menu).forEach(link=>link.addEventListener('click',()=>menu.close()));
}

const enquiry=$<HTMLDialogElement>('#enquiry-dialog')!;
const form=$<HTMLFormElement>('#enquiry-form')!;
const formContent=$<HTMLElement>('[data-form-content]',enquiry)!;
const success=$<HTMLElement>('[data-form-success]',enquiry)!;
const formMessage=$<HTMLElement>('[data-form-message]',form)!;
const submit=$<HTMLButtonElement>('button[type=submit]',form)!;
let enquiryContext='General enquiry';
let submissionId='';
let startedAt=0;
let submitted=false;
let inFlight=false;
let attemptedBody='';
let referenceNeedsReset=false;

function setFieldError(name:string,message?:string){
  const target=$<HTMLElement>(`[data-error="${name}"]`,form);
  const field=$<HTMLInputElement>(`[name="${name}"]`,form);
  if(target){target.textContent=message||'';target.hidden=!message;}
  if(message)field?.setAttribute('aria-invalid','true');else field?.removeAttribute('aria-invalid');
}
function clearErrors(){['name','email','phone','consent'].forEach(name=>setFieldError(name));formMessage.hidden=true;formMessage.textContent='';}
function setSubmissionLabel(label:string){const textNode=[...submit.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);if(textNode)textNode.textContent=label;}
function openEnquiry(context:string,trigger:HTMLElement){
  // Reopening while a request is pending must show the exact enquiry being sent.
  if(inFlight){openDialog(enquiry,trigger);return;}
  if(referenceNeedsReset){submissionId='';attemptedBody='';referenceNeedsReset=false;}
  if(submitted){form.reset();submitted=false;submissionId='';attemptedBody='';}
  if(context!==enquiryContext){submissionId='';attemptedBody='';}
  enquiryContext=context;
  if(!submissionId){submissionId=crypto.randomUUID();startedAt=Date.now();}
  $('[data-enquiry-context]',enquiry)!.textContent=context;
  formContent.hidden=false;success.hidden=true;
  if(!inFlight){clearErrors();submit.disabled=false;setSubmissionLabel('Send enquiry');}
  openDialog(enquiry,trigger);
  window.setTimeout(()=>$('#enquiry-name')?.focus({preventScroll:true}),80);
}
$$<HTMLElement>('[data-enquire]').forEach(trigger=>trigger.addEventListener('click',()=>openEnquiry(trigger.dataset.enquire||'General enquiry',trigger)));
$$<HTMLInputElement>('input',form).forEach(input=>input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid'))setFieldError(input.name);}));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(inFlight)return;clearErrors();
  if(referenceNeedsReset||Date.now()-startedAt>7*24*60*60*1000){
    submissionId=crypto.randomUUID();startedAt=Date.now()-800;attemptedBody='';referenceNeedsReset=false;
  }
  const values=new FormData(form);
  const name=String(values.get('name')||'').trim();
  const email=String(values.get('email')||'').trim();
  const phone=String(values.get('phone')||'').trim();
  const consent=values.get('consent')==='on';
  let valid=true;
  if(name.length<2){setFieldError('name','Please enter your full name.');valid=false;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setFieldError('email','Please enter a valid email address.');valid=false;}
  if(phone&& !/^[+()\d\s.\-]{6,30}$/.test(phone)){setFieldError('phone','Please enter a valid phone number, or leave this blank.');valid=false;}
  if(!consent){setFieldError('consent','Please agree to be contacted about this enquiry.');valid=false;}
  if(!valid){$<HTMLInputElement>('[aria-invalid="true"]',form)?.focus();return;}
  const fingerprint=JSON.stringify({name,email,phone,consent,context:enquiryContext});
  if(attemptedBody&&attemptedBody!==fingerprint)submissionId=crypto.randomUUID();
  attemptedBody=fingerprint;
  const payload={project:'atlantis',context:enquiryContext,name,email,phone,consent,website:String(values.get('website')||''),startedAt,submissionId};
  inFlight=true;submit.disabled=true;form.setAttribute('aria-busy','true');setSubmissionLabel('Sending enquiry…');
  const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let result:{ok?:boolean;id?:string;error?:string;fields?:Record<string,string>};
    try{result=await response.json();}catch{throw new Error('Your enquiry could not be confirmed. Please try again.');}
    if(!response.ok||result.ok!==true||result.id!==payload.submissionId){
      if(response.status===409||/expired|reload the form/i.test(result.error||''))referenceNeedsReset=true;
      if(result.fields)Object.entries(result.fields).forEach(([field,message])=>setFieldError(field,message));
      throw new Error(result.error||'Your enquiry could not be sent. Please try again.');
    }
    submitted=true;formContent.hidden=true;success.hidden=false;success.focus({preventScroll:true});resetDialogScroll(enquiry);
  }catch(error){
    const message=error instanceof Error?(error.name==='AbortError'?'The request took too long. Your details are still here. Please try again.':error.message):'Connection unavailable. Your details are still here. Please try again.';
    formMessage.textContent=message==='Failed to fetch'?'Connection unavailable. Your details are still here. Please try again.':message;
    formMessage.hidden=false;
    $<HTMLInputElement>('[aria-invalid="true"]',form)?.focus();
  }finally{window.clearTimeout(timeout);inFlight=false;submit.disabled=false;form.removeAttribute('aria-busy');setSubmissionLabel('Send enquiry');}
});

type GalleryItem={src:string;caption:string};
const media=$<HTMLDialogElement>('#media-dialog')!;
const mediaImage=$<HTMLImageElement>('[data-media-image]',media)!;
const viewport=$<HTMLElement>('.media-viewport',media)!;
const caption=$<HTMLElement>('#media-caption',media)!;
const mediaStatus=$<HTMLElement>('[data-media-status]',media)!;
const zoomToolbar=$<HTMLElement>('[data-zoom-toolbar]',media)!;
const galleryControls=$<HTMLElement>('[data-media-gallery]',media)!;
let gallery:GalleryItem[]=[];let galleryIndex=0;let scale=1;let fitWidth=0;let isPlan=false;
let mediaRequest=0;let mediaReady=false;
const mediaCache=new Map<string,Promise<HTMLImageElement>>();
function loadMediaImage(src:string){
  const cached=mediaCache.get(src);if(cached)return cached;
  const pending=new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();image.decoding='async';
    image.onload=()=>{void image.decode().then(()=>resolve(image),reject);};
    image.onerror=()=>reject(new Error('Image could not be loaded.'));
    image.src=src;
  });
  mediaCache.set(src,pending);
  while(mediaCache.size>3)mediaCache.delete(mediaCache.keys().next().value!);
  void pending.catch(()=>{if(mediaCache.get(src)===pending)mediaCache.delete(src);});
  return pending;
}
function resetZoom(){scale=1;fitWidth=0;media.classList.remove('is-zoomed');mediaImage.style.width='';mediaImage.style.height='';viewport.scrollTo(0,0);$('[data-zoom-value]',media)!.textContent='100%';updateZoomControls();}
function updateZoomControls(){const minus=$<HTMLButtonElement>('[data-zoom-out]',media),plus=$<HTMLButtonElement>('[data-zoom-in]',media);if(minus)minus.disabled=!mediaReady||scale<=1;if(plus)plus.disabled=!mediaReady||scale>=4;}
function fittedWidth(){return Math.min(mediaImage.naturalWidth||viewport.clientWidth,viewport.clientWidth,viewport.clientHeight*(mediaImage.naturalWidth/(mediaImage.naturalHeight||1)));}
async function renderImage(){
  const index=galleryIndex,item=gallery[index],request=++mediaRequest;
  if(!item)return;
  viewport.setAttribute('aria-busy','true');mediaStatus.textContent='Loading image…';mediaStatus.hidden=false;
  try{
    const loaded=await loadMediaImage(item.src);
    if(request!==mediaRequest||!media.open)return;
    // Commit the photograph and its metadata together only after decoding.
    mediaImage.src=loaded.src;mediaImage.alt=item.caption;mediaImage.hidden=false;
    caption.textContent=item.caption;$('[data-media-count]',media)!.textContent=`${index+1} / ${gallery.length}`;
    mediaReady=true;resetZoom();stopDrag();mediaStatus.hidden=true;
  }catch{
    if(request!==mediaRequest||!media.open)return;
    // Keep the requested index so Next can skip an unavailable photograph.
    mediaStatus.textContent='This image could not be loaded. Try another image or close and reopen the viewer.';
  }finally{if(request===mediaRequest)viewport.removeAttribute('aria-busy');}
}
function zoomTo(next:number){
  if(!isPlan||!mediaReady||!mediaImage.naturalWidth)return;
  const previous=scale;scale=Math.min(4,Math.max(1,next));
  if(!fitWidth)fitWidth=fittedWidth();
  if(scale===1){resetZoom();return;}
  const ratio=mediaImage.naturalWidth/mediaImage.naturalHeight;
  const previousWidth=fitWidth*previous,previousHeight=previousWidth/ratio;
  const focusX=(viewport.scrollLeft+viewport.clientWidth/2-Math.max(0,(viewport.clientWidth-previousWidth)/2))/previousWidth;
  const focusY=(viewport.scrollTop+viewport.clientHeight/2-Math.max(0,(viewport.clientHeight-previousHeight)/2))/previousHeight;
  const width=fitWidth*scale,height=width/ratio;
  media.classList.add('is-zoomed');mediaImage.style.width=`${width}px`;mediaImage.style.height='auto';
  $('[data-zoom-value]',media)!.textContent=`${Math.round(scale*100)}%`;
  viewport.scrollLeft=focusX*width+Math.max(0,(viewport.clientWidth-width)/2)-viewport.clientWidth/2;
  viewport.scrollTop=focusY*height+Math.max(0,(viewport.clientHeight-height)/2)-viewport.clientHeight/2;
  updateZoomControls();
}
mediaImage.addEventListener('load',()=>{if(scale===1)fitWidth=fittedWidth();});
const mediaResize=new ResizeObserver(()=>{if(media.open){resetZoom();stopDrag();}});
mediaResize.observe(viewport,{box:'border-box'});
$$<HTMLElement>('[data-lightbox]').forEach(trigger=>trigger.addEventListener('click',()=>{
  const group=trigger.dataset.gallery;
  const members=group?$$<HTMLElement>(`[data-lightbox][data-gallery="${group}"]`):[trigger];
  gallery=members.map(item=>({src:item.dataset.lightbox!,caption:item.dataset.caption||$('img',item)?.getAttribute('alt')||''}));
  galleryIndex=Math.max(0,members.indexOf(trigger));isPlan=trigger.hasAttribute('data-plan');zoomToolbar.hidden=!isPlan;galleryControls.hidden=gallery.length<2;
  mediaReady=false;mediaImage.hidden=true;mediaImage.removeAttribute('src');mediaImage.alt='';
  caption.textContent=isPlan?'Floor plan viewer':'Image viewer';$('[data-media-count]',media)!.textContent='';resetZoom();
  openDialog(media,trigger);void renderImage();
}));
$('[data-zoom-in]',media)?.addEventListener('click',()=>zoomTo(scale+.5));
$('[data-zoom-out]',media)?.addEventListener('click',()=>zoomTo(scale-.5));
$('[data-zoom-fit]',media)?.addEventListener('click',resetZoom);
function nextImage(direction:number){if(gallery.length<2)return;galleryIndex=(galleryIndex+direction+gallery.length)%gallery.length;void renderImage();}
$('[data-media-prev]',media)?.addEventListener('click',()=>nextImage(-1));
$('[data-media-next]',media)?.addEventListener('click',()=>nextImage(1));
media.addEventListener('keydown',event=>{if(isPlan){if(event.key==='+'||event.key==='='){event.preventDefault();zoomTo(scale+.5);}if(event.key==='-'){event.preventDefault();zoomTo(scale-.5);}if(event.key==='0')resetZoom();}else if(event.key==='ArrowRight'){event.preventDefault();nextImage(1);}else if(event.key==='ArrowLeft'){event.preventDefault();nextImage(-1);}});
let dragStart:{x:number;y:number;left:number;top:number}|null=null;
viewport.addEventListener('pointerdown',event=>{if(scale<=1||event.pointerType!=='mouse')return;dragStart={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');event.preventDefault();});
viewport.addEventListener('pointermove',event=>{if(!dragStart)return;viewport.scrollLeft=dragStart.left-(event.clientX-dragStart.x);viewport.scrollTop=dragStart.top-(event.clientY-dragStart.y);});
function stopDrag(){dragStart=null;viewport.classList.remove('is-dragging');}
viewport.addEventListener('pointerup',stopDrag);viewport.addEventListener('pointercancel',stopDrag);
media.addEventListener('close',()=>{
  mediaRequest++;mediaReady=false;viewport.removeAttribute('aria-busy');mediaStatus.hidden=true;
  mediaImage.hidden=true;mediaImage.removeAttribute('src');resetZoom();stopDrag();
});

$$<HTMLElement>('[data-slider]').forEach(slider=>{
  const slides=$$<HTMLElement>('[data-slide]',slider);
  if(slides.length<2)return;
  const dots=$$<HTMLButtonElement>('[data-slide-to]',slider);
  const counter=$('[data-slider-count]',slider);
  let current=0;let displayed=0;let requestId=0;
  let gesture:{id:number;x:number;y:number}|null=null;
  let suppressClick=false;
  let transition:gsap.core.Tween|null=null;
  function settle(index:number){
    // Finish this exact fromTo before killing it, including its deferred start state.
    transition?.progress(1,true).kill();transition=null;
    gsap.killTweensOf(slides);
    slides.forEach((slide,i)=>{
      slide.hidden=i!==index;slide.inert=i!==index;
      slide.setAttribute('aria-hidden',String(i!==index));
      slide.style.removeProperty('opacity');slide.style.removeProperty('z-index');
    });
  }
  async function show(index:number){
    current=(index+slides.length)%slides.length;
    const next=current;const id=++requestId;
    const originalImage=$<HTMLImageElement>('img',slides[next]);
    // A fresh element retries a failed request without changing srcset or its crop.
    // Attach it only when the latest request has decoded successfully.
    const image=originalImage?.complete&&!originalImage.naturalWidth&&originalImage.currentSrc
      ? originalImage.cloneNode(false) as HTMLImageElement : originalImage;
    if(image){image.loading='eager';await image.decode().catch(()=>undefined);}
    if(id!==requestId)return;
    if(image&&!image.naturalWidth){settle(displayed);return;}
    if(image&&originalImage&&image!==originalImage)originalImage.replaceWith(image);
    settle(displayed);
    dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===next)));
    if(counter)counter.textContent=`${next+1} / ${slides.length}`;
    if(next===displayed)return;
    const incoming=slides[next];const outgoing=slides[displayed];
    displayed=next;
    incoming.hidden=false;incoming.inert=false;incoming.setAttribute('aria-hidden','false');
    if(outgoing.contains(document.activeElement))slider.focus({preventScroll:true});
    outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
    incoming.style.zIndex='1';
    // Fade the decoded image over an opaque previous frame, without a background flash.
    if(reduceMotion.matches){settle(next);return;}
    transition=gsap.fromTo(incoming,{opacity:0},{opacity:1,duration:.45,ease:'power1.out',overwrite:true,onComplete:()=>{if(id===requestId)settle(next);}});
  }
  $('[data-prev]',slider)?.addEventListener('click',()=>{void show(current-1);});
  $('[data-next]',slider)?.addEventListener('click',()=>{void show(current+1);});
  dots.forEach(dot=>dot.addEventListener('click',()=>{void show(Number(dot.dataset.slideTo));}));
  slider.addEventListener('keydown',event=>{
    if(event.target instanceof HTMLSelectElement||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
    if(event.key==='ArrowRight'){event.preventDefault();void show(current+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();void show(current-1);}
  });
  const track=$<HTMLElement>('.interior-slides',slider)||slider;
  track.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||!event.isPrimary)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY};suppressClick=false;
  });
  track.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.5&&!track.hasPointerCapture(event.pointerId))track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
    if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClick=true;void show(current+(dx<0?1:-1));}
  });
  track.addEventListener('pointercancel',()=>{gesture=null;suppressClick=false;});
  track.addEventListener('lostpointercapture',()=>{gesture=null;});
  track.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  reduceMotion.addEventListener('change',()=>settle(displayed));
  settle(0);
});

const filters=$<HTMLFormElement>('#residence-filters');
const catalogueKeys=['bedrooms','area','view'] as const;
const catalogueOptions={bedrooms:['2','3','4','5'],area:['under-300','300-plus'],view:['interior']} as const;
const catalogueParams=new URLSearchParams();
const currentParams=new URLSearchParams(location.search);
catalogueKeys.forEach(key=>{const value=currentParams.get(key);if(value&&(catalogueOptions[key] as readonly string[]).includes(value))catalogueParams.set(key,value);});
// Only known catalogue parameters may be carried back from a residence page.
$$<HTMLAnchorElement>('a[href="/#plans"]').forEach(link=>link.href=`/${catalogueParams.size?'?'+catalogueParams:''}#plans`);
if(filters){
  const row=$<HTMLElement>('[data-unit-result]')!;const empty=$<HTMLElement>('[data-no-results]')!;const result=$<HTMLElement>('[data-result-count]')!;
  const residenceLinks=$$<HTMLAnchorElement>('.unit-row,.catalogue-action a');
  const views=$$<HTMLButtonElement>('[data-unit-view]');
  function persistCatalogue(){
    const data=new FormData(filters!);const url=new URL(location.href);
    ['bedrooms','area'].forEach(key=>{const value=String(data.get(key)||'');if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);});
    const interior=views.find(button=>button.getAttribute('aria-pressed')==='true')?.dataset.unitView==='interior';
    if(interior)url.searchParams.set('view','interior');else url.searchParams.delete('view');
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
    const parameters=new URLSearchParams();catalogueKeys.forEach(key=>{const value=url.searchParams.get(key);if(value)parameters.set(key,value);});
    residenceLinks.forEach(link=>link.href=`/residences/3402/${parameters.size?'?'+parameters:''}`);
  }
  function applyFilters(){const data=new FormData(filters!);const bedrooms=data.get('bedrooms');const area=data.get('area');const matches=(!bedrooms||bedrooms==='4')&&(!area||area==='300-plus');row.hidden=!matches;empty.hidden=matches;result.textContent=matches?'1 residence in this collection':'No matching residences';persistCatalogue();}
  ['bedrooms','area'].forEach(key=>{const field=$<HTMLSelectElement>(`[name="${key}"]`,filters);if(field)field.value=catalogueParams.get(key)||'';});
  filters.addEventListener('change',applyFilters);filters.addEventListener('reset',()=>requestAnimationFrame(applyFilters));
  $('[data-reset-filters]')?.addEventListener('click',()=>filters.reset());
  function setPreview(button:HTMLButtonElement){views.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const plan=$<HTMLElement>('[data-plan-preview]')!,interior=$<HTMLElement>('[data-interior-preview]')!;plan.hidden=button.dataset.unitView!=='plan';interior.hidden=button.dataset.unitView!=='interior';persistCatalogue();}
  views.forEach(button=>button.addEventListener('click',()=>setPreview(button)));
  const restoredView=views.find(button=>button.dataset.unitView===(catalogueParams.get('view')||'plan'));if(restoredView)setPreview(restoredView);
  applyFilters();
}

// ScrollTrigger clears its recorded scroll when the last trigger is removed.
// Preserve a reading anchor around its matchMedia transaction, including pin cleanup.
// These runtime hooks are used by ScrollTrigger but omitted from GSAP's bundled types.
const motionLifecycle = gsap as typeof gsap & {
  addEventListener(type: 'matchMediaInit' | 'matchMedia', listener: () => void): void;
};
type MotionPosition = { anchor: HTMLElement | null; top: number; y: number; width: number; height: number };
function readMotionPosition(): MotionPosition {
  const readingLine = window.innerHeight * .35;
  const sections = [...document.querySelectorAll<HTMLElement>('main section')];
  const anchor = sections.findLast(element => {
    const rect = element.getBoundingClientRect();
    return rect.top <= readingLine && rect.bottom > readingLine;
  }) || null;
  return { anchor, top: anchor?.getBoundingClientRect().top || 0, y: window.scrollY, width: innerWidth, height: innerHeight };
}
let stableMotionPosition = readMotionPosition();
let motionPosition: MotionPosition | null = null;
let positionFrame = 0;
window.addEventListener('scroll', () => {
  if (positionFrame || motionPosition) return;
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0;
    // Resize can clamp scroll before its media-query event. Keep the old anchor.
    if (!motionPosition && stableMotionPosition.width === innerWidth && stableMotionPosition.height === innerHeight) {
      stableMotionPosition = readMotionPosition();
    }
  });
}, { passive: true });
window.addEventListener('resize', () => {
  cancelAnimationFrame(positionFrame);
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0;
    if (!motionPosition) stableMotionPosition = readMotionPosition();
  });
}, { passive: true });
motionLifecycle.addEventListener('matchMediaInit', () => {
  cancelAnimationFrame(positionFrame); positionFrame = 0;
  motionPosition = stableMotionPosition.width !== innerWidth || stableMotionPosition.height !== innerHeight
    ? stableMotionPosition : readMotionPosition();
});
gsap.registerPlugin(ScrollTrigger);
// This listener follows ScrollTrigger's refresh. No delayed correction or smooth scroll.
motionLifecycle.addEventListener('matchMedia', () => {
  if (!motionPosition) return;
  const { anchor, top, y, width, height } = motionPosition;
  const resized = width !== innerWidth || height !== innerHeight;
  let next = y;
  if (y < 1) next = 0;
  else if (anchor?.isConnected) {
    const rect = anchor.getBoundingClientRect();
    // Keep the reading probe inside this section after subpixel scroll rounding.
    const readingTop = resized ? Math.max(top, Math.min(0, innerHeight * .35 + 2 - rect.height)) : top;
    next = window.scrollY + rect.top - readingTop;
  }
  window.scrollTo({ top: Math.max(0, next), behavior: 'instant' });
  ScrollTrigger.update();
  motionPosition = null;
  stableMotionPosition = readMotionPosition();
});
const motion=gsap.matchMedia();
motion.add({desktop:'(min-width: 801px)',motion:'(prefers-reduced-motion: no-preference)',fine:'(pointer: fine)'},context=>{
  const conditions=context.conditions as Record<string,boolean>;
  if(!conditions.motion)return;
  $$<HTMLElement>('[data-reveal]').forEach(element=>{
    if(element.dataset.revealed==='true'||element.getBoundingClientRect().bottom<0)return;
    gsap.from(element,{y:24,duration:.85,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 92%',once:true,onEnter:()=>{element.dataset.revealed='true';}}});
  });
  if(conditions.desktop&&conditions.fine){
    $$<HTMLElement>('[data-parallax]').forEach(element=>gsap.to(element,{yPercent:Number(element.dataset.parallax)||-4,ease:'none',scrollTrigger:{trigger:element.parentElement,start:'top bottom',end:'bottom top',scrub:.6}}));
    $$<HTMLElement>('[data-collage]').forEach((element,i)=>gsap.from(element,{y:(i%2?1:-1)*28,ease:'none',scrollTrigger:{trigger:element,start:'top bottom',end:'bottom center',scrub:.6}}));
    const intro=$<HTMLElement>('[data-scene="residences"]');
    if(intro){
      // A tall source composition must be read before pinning its final viewport.
      // Starting at bottom/bottom prevents short desktop windows from hiding its lower copy.
      const opening=gsap.timeline({scrollTrigger:{trigger:intro,start:()=>intro.offsetHeight>window.innerHeight?'bottom bottom':'top top',end:()=>`+=${Math.min(window.innerHeight,1000)}`,pin:true,scrub:.6,anticipatePin:1,invalidateOnRefresh:true}});
      opening.to([$('.residences-shape',intro),$('.residences-art',intro)],{scale:2.8,duration:1,ease:'power1.inOut'},0)
        .to($('.residences-heading',intro),{opacity:0,y:-32,duration:.45,ease:'power1.out'},.13)
        .to($('.residences-background',intro),{scale:1.08,opacity:.25,duration:1,ease:'none'},0);
    }
  }
});
let refreshFrame=0;
function scheduleRefresh(){if(refreshFrame)return;refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;ScrollTrigger.refresh();});}
window.addEventListener('load',scheduleRefresh,{once:true});
document.fonts.ready.then(scheduleRefresh);
window.addEventListener('pageshow',event=>{if(event.persisted)scheduleRefresh();});
