import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base='http://127.0.0.1:3270',errors=[];
try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/state',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
  await page.goto(base);
  await page.locator('.loading-skeleton').waitFor();
  assert.equal(await page.locator('.loading').getAttribute('aria-busy'),'true');
  await page.getByRole('button',{name:'Coba demo',exact:true}).waitFor();
  await mkdir('outputs',{recursive:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'outputs/uangflow-welcome-polished.png',fullPage:true});
  await page.getByRole('button',{name:'Coba demo',exact:true}).click();
  for(const width of [375,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    for(const name of ['Transaksi','Anggaran','Tabungan','Money coach','Impor CSV','Pengaturan','Ringkasan']){
      const button=page.getByRole('button',{name,exact:true});
      if(!await button.isVisible())await page.locator('.mobile-more summary').click();
      await button.click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} fits ${width}px`);
      assert.equal(await page.locator('h1').count(),1);
    }
    const mainTop=await page.locator('.page-heading').evaluate(e=>e.getBoundingClientRect().top),headerBottom=await page.locator('.topbar').evaluate(e=>e.getBoundingClientRect().bottom);assert.ok(mainTop>=headerBottom,'heading remains below sticky header');
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)));
    if(width===375){
      assert.equal(await page.locator('.sidebar nav>.nav-item:visible').count(),4);
      const summary=page.locator('.mobile-more summary'),bounds=await summary.boundingBox();assert.ok(bounds.height>=44);
      const amount=await page.locator('td.numeric').first().boundingBox();assert.ok(amount.x+amount.width<=width,'mobile transaction amount stays visible');
      await page.screenshot({path:'outputs/uangflow-mobile-polished.png',fullPage:true});
    }
  }
  await page.screenshot({path:'outputs/uangflow-dashboard-polished.png',fullPage:true});
  await page.getByRole('button',{name:'Catat transaksi',exact:false}).click();
  assert.equal(await page.locator('#modal').getAttribute('aria-labelledby'),'dialog-title');
  await page.locator('#tx-form [name=description]').fill('Teks form tetap ada');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').isVisible(),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();await page.getByRole('button',{name:'Coba demo',exact:true}).waitFor();
  assert.equal(await page.locator('.welcome-story').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.setViewportSize({width:844,height:390});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'landscape fits');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.locator('#modal').waitFor();
  assert.ok(await page.locator('#modal').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
  assert.deepEqual(errors,[]);
  console.log('PASS: loading status, all screens at 375/768/1024/1440px, five mobile navigation targets, labelled dialog, Escape, reduced motion and landscape.');
}finally{await browser.close();}
