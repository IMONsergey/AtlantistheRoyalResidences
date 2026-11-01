import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = <T extends Element=HTMLElement>(selector:string, scope:ParentNode=document) => scope.querySelector<T>(selector);
const $$ = <T extends Element=HTMLElement>(selector:string, scope:ParentNode=document) => [...scope.querySelectorAll<T>(selector)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialogs = $$<HTMLDialogElement>('dialog');
let lastFocus: HTMLElement|null = null;

function syncScrollLock(){document.body.classList.toggle('has-dialog',dialogs.some(dialog=>dialog.open));}
function openDialog(dialog:HTMLDialogElement,trigger?:HTMLElement){
  const origin=trigger||document.activeElement as HTMLElement;
  const parentDialog=origin?.closest('dialog[open]');
  // Menu-to-enquiry transitions return to the visible menu button, not a hidden menu item.
  if(!parentDialog||parentDialog===dialog)lastFocus=origin;
  dialogs.forEach(other=>{if(other!==dialog&&other.open)other.close();});
  if(!dialog.open) dialog.showModal();
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
    submitted=true;formContent.hidden=true;success.hidden=false;success.focus();
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
const zoomToolbar=$<HTMLElement>('[data-zoom-toolbar]',media)!;
const galleryControls=$<HTMLElement>('[data-media-gallery]',media)!;
let gallery:GalleryItem[]=[];let galleryIndex=0;let scale=1;let fitWidth=0;let isPlan=false;
function resetZoom(){scale=1;media.classList.remove('is-zoomed');mediaImage.style.width='';mediaImage.style.height='';viewport.scrollTo(0,0);$('[data-zoom-value]',media)!.textContent='100%';}
function renderImage(){resetZoom();fitWidth=0;const item=gallery[galleryIndex];mediaImage.src=item.src;mediaImage.alt=item.caption;caption.textContent=item.caption;$('[data-media-count]',media)!.textContent=`${galleryIndex+1} / ${gallery.length}`;}
function zoomTo(next:number){if(!isPlan)return;const previous=scale;scale=Math.min(4,Math.max(1,next));if(!fitWidth)fitWidth=mediaImage.clientWidth;if(scale===1){resetZoom();return;}media.classList.add('is-zoomed');mediaImage.style.width=`${fitWidth*scale}px`;mediaImage.style.height='auto';$('[data-zoom-value]',media)!.textContent=`${Math.round(scale*100)}%`;viewport.scrollLeft=(viewport.scrollLeft+viewport.clientWidth/2)*scale/previous-viewport.clientWidth/2;viewport.scrollTop=(viewport.scrollTop+viewport.clientHeight/2)*scale/previous-viewport.clientHeight/2;}
mediaImage.addEventListener('load',()=>{if(scale===1)fitWidth=mediaImage.clientWidth;});
$$<HTMLElement>('[data-lightbox]').forEach(trigger=>trigger.addEventListener('click',()=>{
  const group=trigger.dataset.gallery;
  const members=group?$$<HTMLElement>(`[data-lightbox][data-gallery="${group}"]`):[trigger];
  gallery=members.map(item=>({src:item.dataset.lightbox!,caption:item.dataset.caption||$('img',item)?.getAttribute('alt')||''}));
  galleryIndex=Math.max(0,members.indexOf(trigger));isPlan=trigger.hasAttribute('data-plan');zoomToolbar.hidden=!isPlan;galleryControls.hidden=gallery.length<2;
  openDialog(media,trigger);renderImage();
}));
$('[data-zoom-in]',media)?.addEventListener('click',()=>zoomTo(scale+.5));
$('[data-zoom-out]',media)?.addEventListener('click',()=>zoomTo(scale-.5));
$('[data-zoom-fit]',media)?.addEventListener('click',resetZoom);
function nextImage(direction:number){if(gallery.length<2)return;galleryIndex=(galleryIndex+direction+gallery.length)%gallery.length;renderImage();}
$('[data-media-prev]',media)?.addEventListener('click',()=>nextImage(-1));
$('[data-media-next]',media)?.addEventListener('click',()=>nextImage(1));
media.addEventListener('keydown',event=>{if(isPlan){if(event.key==='+'||event.key==='='){event.preventDefault();zoomTo(scale+.5);}if(event.key==='-'){event.preventDefault();zoomTo(scale-.5);}if(event.key==='0')resetZoom();}else if(event.key==='ArrowRight'){event.preventDefault();nextImage(1);}else if(event.key==='ArrowLeft'){event.preventDefault();nextImage(-1);}});
let dragStart:{x:number;y:number;left:number;top:number}|null=null;
viewport.addEventListener('pointerdown',event=>{if(scale<=1||event.pointerType!=='mouse')return;dragStart={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');event.preventDefault();});
viewport.addEventListener('pointermove',event=>{if(!dragStart)return;viewport.scrollLeft=dragStart.left-(event.clientX-dragStart.x);viewport.scrollTop=dragStart.top-(event.clientY-dragStart.y);});
function stopDrag(){dragStart=null;viewport.classList.remove('is-dragging');}
viewport.addEventListener('pointerup',stopDrag);viewport.addEventListener('pointercancel',stopDrag);
media.addEventListener('close',()=>{resetZoom();stopDrag();});

$$<HTMLElement>('[data-slider]').forEach(slider=>{
  const slides=$$<HTMLElement>('[data-slide]',slider);
  const dots=$$<HTMLButtonElement>('[data-slide-to]',slider);
  const counter=$('[data-slider-count]',slider);
  let current=0;let startX=0;let startY=0;
  function show(index:number){current=(index+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.hidden=i!==current;slide.setAttribute('aria-hidden',String(i!==current));});dots.forEach((dot,i)=>{dot.setAttribute('aria-current',String(i===current));});if(counter)counter.textContent=`${current+1} / ${slides.length}`;if(!reduceMotion.matches)gsap.fromTo(slides[current],{opacity:.5},{opacity:1,duration:.45,overwrite:true});}
  $('[data-prev]',slider)?.addEventListener('click',()=>show(current-1));$('[data-next]',slider)?.addEventListener('click',()=>show(current+1));
  dots.forEach(dot=>dot.addEventListener('click',()=>show(Number(dot.dataset.slideTo))));
  slider.addEventListener('keydown',event=>{if(event.target instanceof HTMLSelectElement)return;if(event.key==='ArrowRight'){event.preventDefault();show(current+1);}if(event.key==='ArrowLeft'){event.preventDefault();show(current-1);}});
  slider.addEventListener('pointerdown',event=>{startX=event.clientX;startY=event.clientY;});
  slider.addEventListener('pointerup',event=>{if(event.pointerType==='mouse')return;const x=event.clientX-startX,y=event.clientY-startY;if(Math.abs(x)>55&&Math.abs(x)>Math.abs(y)*1.5)show(current+(x<0?1:-1));});
  show(0);
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

gsap.registerPlugin(ScrollTrigger);
const motion=gsap.matchMedia();
motion.add({desktop:'(min-width: 801px)',motion:'(prefers-reduced-motion: no-preference)',fine:'(pointer: fine)'},context=>{
  const conditions=context.conditions as Record<string,boolean>;
  if(!conditions.motion)return;
  $$<HTMLElement>('[data-reveal]').forEach(element=>gsap.from(element,{y:24,duration:1.05,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 92%',once:true}}));
  if(conditions.desktop&&conditions.fine){
    $$<HTMLElement>('[data-parallax]').forEach(element=>gsap.to(element,{yPercent:Number(element.dataset.parallax)||-4,ease:'none',scrollTrigger:{trigger:element.parentElement,start:'top bottom',end:'bottom top',scrub:.8}}));
    $$<HTMLElement>('[data-collage]').forEach((element,i)=>gsap.from(element,{y:(i%2?1:-1)*28,ease:'none',scrollTrigger:{trigger:element,start:'top bottom',end:'bottom center',scrub:.7}}));
    const intro=$<HTMLElement>('[data-scene="residences"]');
    if(intro){
      // The source storyboard opens the signature silhouette into the paper
      // catalogue. Pin only the fine-pointer desktop scene; native scrolling
      // and the complete composition remain the touch/reduced-motion path.
      const opening=gsap.timeline({scrollTrigger:{trigger:intro,start:'top top',end:()=>`+=${Math.min(window.innerHeight*1.2,1100)}`,pin:true,scrub:.8,anticipatePin:1,invalidateOnRefresh:true}});
      opening.to([$('.residences-shape',intro),$('.residences-art',intro)],{scale:2.8,duration:1,ease:'power1.inOut'},0)
        .to($('.residences-heading',intro),{opacity:0,y:-32,duration:.45,ease:'power1.out'},.13)
        .to($('.residences-background',intro),{scale:1.08,opacity:.25,duration:1,ease:'none'},0);
    }
  }
});
window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
document.fonts.ready.then(()=>ScrollTrigger.refresh());
