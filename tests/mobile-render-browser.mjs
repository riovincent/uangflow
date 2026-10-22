import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193';
const out='outputs/mobile-render';await mkdir(out,{recursive:true});
try{
 for(const [name,viewport,deviceScaleFactor,hasTouch] of [
  ['phone',{width:390,height:844},3,true],
  ['phone-desktop-mode',{width:980,height:2100},1,true],
  ['desktop',{width:1440,height:900},1.5,false],
 ]){
  const context=await browser.newContext({viewport,deviceScaleFactor,hasTouch,isMobile:name==='phone'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGL|shader|GL_INVALID/i.test(message.text()))errors.push(message.text());});
  await page.addInitScript(()=>{
   window.renderCheck={contexts:[],samples:[],busyDraws:0};
   const getContext=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){
    if(type.startsWith('webgl'))window.renderCheck.contexts.push(document.querySelector('.opening-logo path')?.getAttribute('stroke-dashoffset')||'1');
    return getContext.call(this,type,...args);
   };
   for(const method of ['drawArrays','drawElements']){
    const draw=WebGL2RenderingContext.prototype[method];
    WebGL2RenderingContext.prototype[method]=function(...args){
     const offset=Number(document.querySelector('.opening-logo path')?.getAttribute('stroke-dashoffset')??1);
     if(offset<1&&document.body.classList.contains('opening-active'))window.renderCheck.busyDraws++;
     return draw.apply(this,args);
    };
   }
   function sample(){
    const logo=document.querySelector('.opening-logo');
    if(logo){
     window.renderCheck.samples.push({
      reveal:Number(logo.querySelector('path').getAttribute('stroke-dashoffset')),
      bounce:Number(logo.querySelector('svg').style.transform.match(/scale\(([^)]+)/)?.[1]||1),
      shine:Number(logo.querySelector('.opening-shine').style.opacity||0),
      width:logo.getBoundingClientRect().width,
     });
    }
    if(!window.renderCheck.samples.length||logo)requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  if(hasTouch){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.opening').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.renderCheck.samples.some(frame=>frame.reveal<.8&&frame.reveal>.1));
  await page.screenshot({path:`${out}/${name}-reveal.png`});
  await page.locator('.opening').waitFor({state:'hidden',timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#ocean')?.width>300&&window.renderCheck.contexts.length>0);
  await page.waitForTimeout(600);
  const result=await page.evaluate(()=>{
   const canvas=document.querySelector('#ocean'),gl=canvas.getContext('webgl2');
   return {...window.renderCheck,pixels:canvas.width*canvas.height,width:canvas.width,height:canvas.height,hidden:canvas.hidden,glError:gl.getError(),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(result.contexts.every(offset=>offset==='1'),'WebGL compilation finishes before the reveal starts');
  assert.equal(result.busyDraws,0,'Scene rendering does not compete with the opening');
  assert.ok(result.samples.some(frame=>frame.reveal>.98),'Reveal starts at its first phase');
  assert.ok(result.samples.some(frame=>frame.reveal<.01),'Reveal completes');
  assert.ok(result.samples.some(frame=>frame.bounce>1.08),'Approved stationary bounce remains');
  assert.ok(result.samples.some(frame=>frame.shine>.7),'Approved shine remains');
  assert.ok(result.samples.some(frame=>frame.width<100),'Logo still docks into the header');
  for(let i=1;i<result.samples.length;i++)assert.ok(result.samples[i-1].reveal-result.samples[i].reveal<.1,'Reveal never jumps across a phase');
  if(hasTouch)assert.ok(result.pixels<=1000000,'Touch devices keep their GPU pixel budget in desktop mode too');
  assert.equal(result.hidden,false);assert.equal(result.glError,0);assert.equal(result.overflow,false);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${name}-scene.png`});
  console.log(`PASS ${name}: ${result.samples.length} opening frames, complete choreography, no competing WebGL draws, ${result.width}x${result.height} drawing buffer, no shader errors.`);
  await context.close();
 }
 // Check the actual cloud hash on WebGL2 against exact integer arithmetic.
 const page=await browser.newPage();await page.goto(base);await page.emulateMedia({reducedMotion:'reduce'});
 const source=await readFile(new URL('../public/glass/atmosphere.js',import.meta.url),'utf8');
 const hash=source.match(/float hash\(vec2 p\)\{[^\n]+/)[0];
 const values=await page.evaluate(hash=>{
  const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=1;
  const gl=canvas.getContext('webgl2',{antialias:false});
  function shader(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;precision highp int;out vec4 color;'+hash+'\nvoid main(){float i=floor(gl_FragCoord.x);float h=hash(vec2(mod(i,64.)-32.,floor(i/64.)-32.));color=vec4(h,h,h,1.);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.disable(gl.DITHER);gl.drawArrays(gl.TRIANGLES,0,3);
  const pixels=new Uint8Array(4096*4);gl.readPixels(0,0,4096,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  gl.getExtension('WEBGL_lose_context').loseContext();return [...pixels.filter((_,i)=>i%4===0)];
 },hash);
 for(let i=0;i<values.length;i++){
  let n=(Math.imul(i%64-32,1597334677)^Math.imul(Math.floor(i/64)-32,3812015801))>>>0;
  n=Math.imul(n^(n>>>16),2246822519)>>>0;n=Math.imul(n^(n>>>13),3266489917)>>>0;
  const expected=Math.round(((n^(n>>>16))>>>8)/16777216*255);
  assert.ok(Math.abs(values[i]-expected)<=1,`Cloud lattice ${i} matches integer hash`);
 }
 assert.ok(new Set(values).size>240,'Cloud hash retains its tonal range');
 console.log('PASS: 4,096 cloud lattice samples match exact integer arithmetic on WebGL2.');
}finally{await browser.close();}
