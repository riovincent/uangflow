import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],base=process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193';
const out='outputs/experience';await mkdir(out,{recursive:true});
const pages={Ringkasan:'dashboard',Transaksi:'transactions',Anggaran:'budget',Tabungan:'goals','Money coach':'coach','Impor CSV':'imports',Pengaturan:'settings'};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('uangflow.language','id'));
 await page.goto(base);await page.locator('.opening').waitFor({state:'visible'});
 assert.equal(await page.locator('.opening button').count(),0,'Opening has no skip control');
 await page.locator('.opening').waitFor({state:'hidden',timeout:12000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),900,'Home occupies one viewport');
 await page.screenshot({path:`${out}/home-desktop.png`});
 assert.equal(new URL(page.url()).hash,'','Home URL has no fragment');
 await page.locator('.site-nav summary').filter({hasText:'Sumber daya'}).click();await page.getByRole('link',{name:'Cara kerja',exact:true}).click();await page.waitForFunction(()=>location.hash==='#panduan');
 await page.getByRole('link',{name:'UangFlow, beranda',exact:true}).filter({visible:true}).click();await page.waitForFunction(()=>location.hash==='');
 await page.goBack();await page.waitForFunction(()=>location.hash==='#panduan');
 await page.goForward();await page.waitForFunction(()=>location.hash==='');
 await page.getByRole('button',{name:'Jelajahi demo',exact:true}).click();
 assert.ok(await page.locator('.click-wave').count()>0,'Click creates a circular wave');
 await page.locator('.motion-word').first().waitFor();
 const oldTitle=await page.locator('h1 .motion-word').first().elementHandle();
 await page.getByRole('button',{name:'Ringkasan',exact:true}).click();
 await page.waitForFunction(node=>!node.isConnected,oldTitle);
 assert.ok(await page.locator('h1 .motion-word').first().evaluate(node=>node.getAnimations().length)>0,'Active option replays word animation');
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:width===768?1024:width===390?844:900});
  for(const [name,route] of Object.entries(pages)){
   const option=page.getByRole('button',{name,exact:true}).first();
   if(name==='Pengaturan')await page.getByRole('button',{name:/^Menu akun/}).filter({visible:true}).click();else if(!await option.isVisible())await page.locator('.mobile-more summary').click();
   await option.click();await page.waitForFunction(hash=>location.hash===hash,'#'+route);
   await page.waitForTimeout(680);
   assert.equal(await page.locator('main h1').count(),1,`${route}: one heading`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} fits ${width}px`);
   await page.screenshot({path:`${out}/${width}-${route}.png`});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Ringkasan',exact:true}).click();
 await page.waitForFunction(()=>location.hash==='#dashboard');
 const transforms=await page.locator('h1 .motion-word').evaluateAll(nodes=>nodes.flatMap(node=>node.getAnimations().flatMap(animation=>animation.effect.getKeyframes())).filter(frame=>frame.transform&&frame.transform!=='none'));
 assert.deepEqual(transforms,[],'Reduced motion never animates words with transforms');
 await page.getByRole('button',{name:'Keluar demo',exact:true}).click();await page.locator('.hero').waitFor();
 assert.equal(new URL(page.url()).hash,'','Leaving demo returns to the clean home URL');
 for(const [width,height] of [[390,844],[470,604],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Home fits ${width}px`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),height,`Home fits ${height}px height`);
  await page.screenshot({path:`${out}/home-${width}x${height}.png`});
 }
 await page.goto(base+'/#beranda');await page.waitForFunction(()=>location.hash==='');
 assert.equal(await page.locator('.hero').count(),1,'Legacy home fragment resolves to the homepage');
 assert.deepEqual(errors,[]);
 console.log('PASS: full opening, no skip button, circular click wave, replay on active option, all seven screens at 1440/768/390, reduced motion, and one-screen home including landscape.');
}finally{await browser.close();}
