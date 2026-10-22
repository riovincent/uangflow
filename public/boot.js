import {watchLanguage,language} from './i18n.js';
import {siteHeader,publicRoutes,publicLayout} from './public-site.js';
const publicRoute=publicRoutes.includes(location.hash.slice(1));
if(publicRoute){document.querySelector('#app').innerHTML=publicLayout(location.hash.slice(1));document.body.classList.remove('on-home','boot-pending');document.body.classList.add('on-public');}
const header=document.querySelector('.site-header');if(header)header.outerHTML=siteHeader(language());
watchLanguage();
import {playOpening} from './glass/opening.js';

// Start the approved opening independently of account and data requests.
export function startHome(root,opening=false){
  const hero=root.querySelector('.hero');
  let disposed=false,disposeScene=()=>{};
  const scene=import('./glass/atmosphere.js').catch(()=>null);
  // Warm the hidden scene before the reveal; its animation waits for the opening.
  function showScene(){return scene.then(module=>{if(module&&!disposed&&hero.isConnected)disposeScene=module.mountAtmosphere(hero);}).catch(()=>{});}
  const stop=opening?playOpening(matchMedia('(prefers-reduced-motion: reduce)'),showScene):()=>{};
  if(!opening)showScene();
  document.body.classList.remove('boot-pending');
  return {hero,stop,dispose(){disposed=true;stop();disposeScene();}};
}
export const initialHome=document.querySelector('#app .hero')?startHome(document.querySelector('#app'),true):null;
