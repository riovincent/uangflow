export const motionTokens={duration:{fast:180,normal:350,slow:600},login:{duration:1200,exitDuration:350,scale:.88,blur:6},easing:'cubic-bezier(.22,1,.36,1)',distance:16,stagger:65};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let generation=0,currentExit;

export function replayWords(container){
  const title=container?.querySelector('h1');if(!title||!title.animate)return;
  const text=title.innerText.trim();title.replaceChildren();
  for(const [index,word] of text.split(/\s+/).entries()){
    const span=document.createElement('span');span.className='motion-word';span.textContent=word;
    title.append(span,document.createTextNode(' '));
    span.animate(reduced()?[{opacity:.5},{opacity:1}]:[{opacity:0,transform:`translateY(${motionTokens.distance}px)`},{opacity:1,transform:'translateY(0)'}],{duration:reduced()?motionTokens.duration.fast:motionTokens.duration.slow,delay:reduced()?0:index*motionTokens.stagger,easing:motionTokens.easing,fill:'backwards'});
  }
  const copy=container.querySelector('.page-heading p, .hero-copy p');
  copy?.animate(reduced()?[{opacity:.5},{opacity:1}]:[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:reduced()?motionTokens.duration.fast:motionTokens.duration.normal,delay:reduced()?0:120,easing:motionTokens.easing,fill:'backwards'});
}

export async function transitionPage(update,{login=false}={}){
  const preset=login?motionTokens.login:{duration:motionTokens.duration.slow,exitDuration:motionTokens.duration.fast,scale:.965,blur:0};
  const request=++generation;currentExit?.cancel();
  const previous=document.querySelector('.workspace main, .landing main');
  if(previous?.animate&&!reduced()){
    currentExit=previous.animate([{opacity:1,transform:'scale(1)',filter:'blur(0)'},{opacity:.15,transform:'scale(1.035)',filter:`blur(${preset.blur}px)`}],{duration:preset.exitDuration,easing:motionTokens.easing});
    await currentExit.finished.catch(()=>{});
  }
  if(request!==generation)return;
  update();window.scrollTo({top:0,behavior:'instant'});
  const next=document.querySelector('.workspace main, .landing main');
  if(next?.animate)next.animate(reduced()?[{opacity:.4},{opacity:1}]:[{opacity:0,transform:`scale(${preset.scale})`,filter:`blur(${preset.blur}px)`},{opacity:1,transform:'scale(1)',filter:'blur(0)'}],{duration:reduced()?motionTokens.duration.fast:preset.duration,easing:motionTokens.easing});
  replayWords(next);
  const heading=next?.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}

document.addEventListener('click',event=>{
  const option=event.target.closest('button:not(:disabled),a,summary');
  if(!option||reduced()||option.closest('.opening'))return;
  const bounds=option.getBoundingClientRect(),ripple=document.createElement('span');
  ripple.className='click-wave';ripple.ariaHidden='true';
  ripple.style.left=`${event.detail?event.clientX:bounds.left+bounds.width/2}px`;
  ripple.style.top=`${event.detail?event.clientY:bounds.top+bounds.height/2}px`;
  document.body.append(ripple);
  const animation=ripple.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.85},{transform:'translate(-50%,-50%) scale(9)',opacity:0}],{duration:motionTokens.duration.slow,easing:motionTokens.easing});
  animation.finished.catch(()=>{}).finally(()=>ripple.remove());
},true);
