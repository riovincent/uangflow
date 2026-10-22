import * as THREE from './vendor/three.module.js';
import {waterContact} from './water-contact.mjs';
import {createSeaScene} from './sea-scene.js';
export function mountAtmosphere(hero){
const card=hero.querySelector('#money-card'),canvas=hero.querySelector('#ocean');
const events=new AbortController(),cleanups=[];let disposed=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,visible=true,frameId=0,last=0,time=0;
const pointer={x:0,y:0},current={x:0,y:0};
let addContact=()=>{};
hero.addEventListener('pointerdown',event=>addContact(event,true),{signal:events.signal});
hero.addEventListener('pointermove',event=>{addContact(event,false);if(event.pointerType==='touch')return;const bounds=hero.getBoundingClientRect();pointer.x=(event.clientX-bounds.left)/bounds.width*2-1;pointer.y=(event.clientY-bounds.top)/bounds.height*2-1;},{signal:events.signal});
hero.addEventListener('pointerleave',()=>{pointer.x=pointer.y=0;},{signal:events.signal});

const fragmentShader=`
precision highp float;
precision highp int;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform vec4 uContacts[6];
uniform vec4 uCard;
// Integer mixing avoids device-dependent sine precision in the cloud lattice.
float hash(vec2 p){uvec2 q=uvec2(ivec2(p));uint n=q.x*1597334677u^q.y*3812015801u;n=(n^(n>>16u))*2246822519u;n=(n^(n>>13u))*3266489917u;return float((n^(n>>16u))>>8u)/16777216.;}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float cloud(vec2 p){return .5*noise(p)+.26*noise(p*2.03)+.13*noise(p*4.07)+.065*noise(p*8.13);}
void main(){
 vec2 uv=vUv;float horizon=uAspect<.8?.35:.43;
 float altitude=max(uv.y-horizon,0.);
 float glow=exp(-pow((uv.x-.5)*uAspect*2.3,2.)-pow(altitude*4.3,2.));
 vec3 color=mix(vec3(.105,.22,.34),vec3(.26,.45,.56),exp(-altitude*3.));
 vec2 drift=vec2(uTime*.023,uTime*.004);
 vec2 p=vec2((uv.x-.5)*uAspect*3.,uv.y*5.5);
 float low=cloud(p+drift);
 float high=cloud(p*1.8-drift*.7+vec2(5.3,2.1));
 float body=smoothstep(.32,.68,low+.12*high);
 float layer=smoothstep(.0,.12,altitude);
 vec3 cloudColor=mix(vec3(.17,.31,.44),vec3(.47,.64,.71),smoothstep(.40,.66,low));
 color=mix(color,cloudColor,body*layer*.55);
 color+=vec3(.16,.26,.28)*glow;
 color+=vec3(.07,.12,.15)*smoothstep(.44,.66,high)*layer;
 if(uv.y<horizon)color=vec3(.20,.37,.47);
 vec2 cardSpace=abs(vec2((uv.x-uCard.x)*uAspect,uv.y-uCard.y))-vec2(uCard.z*uAspect,uCard.w)*.54;
 float cardDistance=length(max(cardSpace,0.))+min(max(cardSpace.x,cardSpace.y),0.);
 float backlight=exp(-pow(max(cardDistance,0.)*9.,2.));
 float rimlight=exp(-pow(cardDistance*38.,2.));
 color+=vec3(.05,.10,.13)*backlight+vec3(.04,.10,.13)*rimlight;
 color+=(hash(uv*vec2(1700.,1100.))-.5)*.009;
 color*=1.-.20*pow(length((uv-.5)*vec2(1.,.8)),1.5);
 color*=mix(.84,1.,smoothstep(.0,.48,uv.x));
 gl_FragColor=vec4(color,1.);
}`;
let renderer,background,screenCamera,uniforms,sea;
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.autoClear=false;
 background=new THREE.Scene();screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const contacts=Array.from({length:6},()=>new THREE.Vector4(0,0,-100,0));
 uniforms={uTime:{value:0},uAspect:{value:1},uContacts:{value:contacts},uCard:{value:new THREE.Vector4(.5,.5,.23,.48)}};
 sea=createSeaScene(uniforms);
 let contactIndex=0,lastContactAt=0;
 addContact=(event,force)=>{
   if(paused||reduced.matches)return;
   const now=performance.now();if(!force&&now-lastContactAt<85)return;
   const point=waterContact(event.clientX,event.clientY,hero.getBoundingClientRect(),time);
   if(!point)return;
   contacts[contactIndex].set(point.x,point.y,point.time,force?1.4:.8);
   contactIndex=(contactIndex+1)%contacts.length;lastContactAt=now;
 };
 background.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}',fragmentShader,uniforms,depthWrite:false,depthTest:false})));
 function resize(){const width=hero.clientWidth,height=hero.clientHeight;if(!width||!height)return;
 // Touch hardware keeps its pixel budget even when Chrome requests a desktop viewport.
 const touch=navigator.maxTouchPoints>0;
 renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1.5,touch?Math.sqrt(1000000/(width*height)):Infinity));
 renderer.setSize(width,height,false);uniforms.uAspect.value=width/height;sea.resize(width,height,width/height<.8?.35:.43,renderer.getPixelRatio());
 const bounds=hero.getBoundingClientRect(),object=document.querySelector('#object-stage').getBoundingClientRect();
 uniforms.uCard.value.set((object.left-bounds.left+object.width/2)/width,1-(object.top-bounds.top+object.height/2)/height,object.width/width,object.height/height);render();}
 resize();
 const observer=new ResizeObserver(resize);observer.observe(hero);cleanups.push(()=>observer.disconnect());
 function render(){if(disposed)return;
   renderer.clear();renderer.render(background,screenCamera);sea.render(renderer,time);
 }
 function tick(now){frameId=0;const dt=Math.min((now-last)/1000,.04);last=now;
 if(document.body.classList.contains('opening-active')){frameId=requestAnimationFrame(tick);return;}
 if(!paused&&!reduced.matches){time+=dt;current.x+=(pointer.x-current.x)*(1-Math.exp(-dt*4));current.y+=(pointer.y-current.y)*(1-Math.exp(-dt*4));card.style.transform=`rotateX(${-current.y*8}deg) rotateY(${current.x*14}deg) translateY(${Math.sin(time*.65)*7}px)`;uniforms.uTime.value=time;}render();if(!paused&&!reduced.matches&&visible&&!document.hidden)frameId=requestAnimationFrame(tick);}
 function resume(){if(disposed)return;cancelAnimationFrame(frameId);last=performance.now();if(!paused&&!reduced.matches&&visible&&!document.hidden)frameId=requestAnimationFrame(tick);else{card.style.transform='none';render();}}
 reduced.addEventListener('change',()=>{paused=reduced.matches;resume();},{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('document-hidden',document.hidden);resume();},{signal:events.signal});
 const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();},{threshold:0});visibility.observe(hero);cleanups.push(()=>visibility.disconnect());
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frameId);canvas.hidden=true;card.style.transform='none';},{signal:events.signal});
 resume();
}catch(error){canvas.hidden=true;console.warn('Scene fallback active:',error.message);}


return ()=>{disposed=true;events.abort();cancelAnimationFrame(frameId);for(const dispose of cleanups)dispose();if(sea)sea.dispose();if(background)background.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});renderer?.dispose();renderer?.forceContextLoss();};
}
