import {INTRO,CONTINUATION_DELAY,smooth,logoScale} from './opening-motion.mjs';

export function playOpening(reduced){
  if(reduced.matches)return ()=>{};
  const main=document.querySelector('main'),header=document.querySelector('.header'),brand=header.querySelector('.brand'),nav=header.querySelector('nav');
  const overlay=document.createElement('div');overlay.className='opening';
  overlay.innerHTML='<div class="opening-backdrop"></div><div class="opening-logo" aria-hidden="true"><img src="/glass/assets/uangflow-symbol.png" alt=""><div class="opening-shine"><i></i></div></div>';
  document.body.append(overlay);
  const logo=overlay.querySelector('.opening-logo'),shine=overlay.querySelector('.opening-shine'),beam=shine.firstElementChild,backdrop=overlay.firstElementChild;
  let frame=0,done=false,last,elapsed=0,deadline;
  main.inert=header.inert=true;document.body.classList.add('opening-active');
  main.style.opacity=brand.style.opacity=nav.style.opacity='0';
  function finish(){
    if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(deadline);
    reduced.removeEventListener('change',onReduced);
    document.removeEventListener('visibilitychange',onVisibility);
    const restoreFocus=overlay.contains(document.activeElement);
    main.inert=header.inert=false;
    for(const element of [main,brand,nav]){element.style.removeProperty('opacity');element.style.removeProperty('clip-path');}
    document.body.classList.remove('opening-active');overlay.remove();
    if(restoreFocus)brand.focus({preventScroll:true});
  }
  function onReduced(){if(reduced.matches)finish();}
  reduced.addEventListener('change',onReduced);
  function onVisibility(){last=undefined;}
  document.addEventListener('visibilitychange',onVisibility);
  // Keep recovery for a stalled animation without expiring a hidden or slow tab.
  function watch(){
    if(document.hidden||(last!==undefined&&performance.now()-last<1500))deadline=setTimeout(watch,9000);
    else finish();
  }
  deadline=setTimeout(watch,9000);
  function tick(now){
    if(done)return;
    // GPU setup and background-tab throttling must not skip the choreography.
    if(last!==undefined&&!document.hidden)elapsed+=Math.min((now-last)/1000,.05);
    last=now;
    const t=elapsed;
    const dock=smooth((t-INTRO.dockStart)/(INTRO.dockEnd-INTRO.dockStart));
    const target=header.querySelector('.brand-icon').getBoundingClientRect();
    const initialWidth=Math.min(360,innerWidth*.58,innerHeight*.42),width=initialWidth+(target.width-initialWidth)*dock;
    const x=(innerWidth-initialWidth)/2*(1-dock)+target.left*dock;
    const y=(innerHeight-initialWidth*910/1070)/2*(1-dock)+target.top*dock-90*Math.sin(Math.PI*dock);
    Object.assign(logo.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${width*910/1070}px`,transform:`rotate(${-12*(1-smooth((t-INTRO.revealStart)/(INTRO.revealEnd-INTRO.revealStart)))}deg) scale(${logoScale(t)})`});
    const reveal=smooth((t-INTRO.revealStart)/(INTRO.revealEnd-INTRO.revealStart));
    const fill=smooth((t-INTRO.fillStart)/(INTRO.revealEnd-INTRO.fillStart));
    const mask=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="110 205 1070 910"><rect x="110" y="205" width="1070" height="910" fill="white" opacity="${fill}"/><path d="M440 270 C230 410 225 680 410 880 C570 1060 885 1110 1040 875 C1150 710 1050 610 940 570" fill="none" stroke="white" stroke-width="480" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-reveal}"/></svg>`;
    logo.style.maskImage=`url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
    const handoff=smooth((t-(3.14+CONTINUATION_DELAY))/.11);
    logo.style.opacity=String(smooth((t-.16)/.16)*(1-handoff));
    const shineProgress=smooth((t-INTRO.shineStart)/(INTRO.shineEnd-INTRO.shineStart));
    Object.assign(shine.style,{maskSize:`${1254*width/1070}px ${1254*width/1070}px`,maskPosition:`${-110*width/1070}px ${-205*width/1070}px`,opacity:String(.8*Math.sin(Math.PI*shineProgress)**2)});
    beam.style.left=`${-45+180*shineProgress}%`;
    const page=smooth((t-(2.85+CONTINUATION_DELAY))/(INTRO.pageEnd-(2.85+CONTINUATION_DELAY)));
    main.style.opacity=String(page);backdrop.style.opacity=String(1-page);
    brand.style.opacity=String(handoff);
    brand.style.clipPath=`inset(0 ${100*(1-smooth((t-(3.17+CONTINUATION_DELAY))/.33))}% 0 0)`;
    nav.style.opacity=String(smooth((t-(3.1+CONTINUATION_DELAY))/.55));
    if(t>=INTRO.pageEnd+.1)finish();else frame=requestAnimationFrame(tick);
  }
  Promise.all([...overlay.querySelectorAll('img')].map(image=>image.decode().catch(()=>{}))).then(()=>{if(!done)frame=requestAnimationFrame(tick);});
  return finish;
}
