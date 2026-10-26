import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193';
const out='outputs/public-site';await mkdir(out,{recursive:true});
const errors=[],copy=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base);await page.getByRole('button',{name:'Explore demo',exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(new URL(page.url()).hash,'');
 const community=page.locator('.site-nav summary').filter({hasText:'Community'}),resources=page.locator('.site-nav summary').filter({hasText:'Resources'});
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:width===768?1024:900});await community.click();
  const dropdown=page.locator('.community-menu');await dropdown.waitFor({state:'visible'});
  const box=await dropdown.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,`Community fits ${width}`);
  assert.equal(await dropdown.getByRole('link',{name:/riovincent@uangflow.org/}).getAttribute('href'),'mailto:riovincent@uangflow.org');assert.equal(await dropdown.getByRole('link',{name:/WhatsApp/}).getAttribute('href'),'https://wa.me/6282286819680');
  await page.screenshot({path:`${out}/community-${width}.png`});await page.keyboard.press('Escape');assert.equal(await dropdown.isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Home fits ${width}`);
 }
 await page.getByRole('link',{name:'Pricing',exact:true}).click();await page.getByRole('heading',{name:'Pro',exact:true}).waitFor();
 await page.getByText('$9.89',{exact:true}).waitFor();assert.equal(await page.locator('s').innerText(),'$19.89');assert.equal(await page.getByText('Limited time',{exact:true}).isVisible(),true);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});
  const header=await page.locator('.site-header').boundingBox(),title=await page.locator('.public-intro h1').boundingBox();assert.ok(title.y>=header.y+header.height+20,`Pricing heading clears header at ${width}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Pricing fits ${width}`);await page.screenshot({path:`${out}/pricing-en-${width}.png`,fullPage:true});
 }
 await page.screenshot({path:`${out}/pricing-en-mobile.png`,fullPage:true});
 await page.locator('.language-dropdown summary').click();await page.getByRole('button',{name:'Indonesia',exact:true}).click();
 await page.getByText('Rp178.000',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Indonesian navigation fits mobile');assert.equal(await page.locator('s').innerText(),'Rp358.000');assert.equal(await page.locator('html').getAttribute('lang'),'id');
 await page.reload();await page.getByText('Rp178.000',{exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'id');
 await page.locator('.language-dropdown summary').click();await page.getByRole('button',{name:'English',exact:true}).click();
 await page.getByRole('link',{name:'Docs',exact:true}).click();await page.getByRole('heading',{name:'Your UangFlow guide.',exact:true}).waitFor();
 await page.screenshot({path:`${out}/docs-en-mobile.png`,fullPage:true});
 await page.getByRole('link',{name:'Account & privacy',exact:true}).click();assert.equal(new URL(page.url()).hash,'#docs');
 await resources.click();await page.getByRole('link',{name:'Resource library',exact:true}).click();await page.getByRole('heading',{name:'A clear place to start.',exact:true}).waitFor();
 await community.click();await page.locator('.community-menu').getByRole('link',{name:'Overview',exact:true}).click();await page.getByRole('heading',{name:'Better money habits, together.',exact:true}).waitFor();
 assert.equal(await page.locator('main').getByRole('link',{name:/WhatsApp/}).getAttribute('href'),'https://wa.me/6282286819680');
 await page.getByRole('link',{name:'UangFlow, home',exact:true}).click();await page.getByRole('button',{name:'Sign in / Sign up',exact:false}).click();await page.getByRole('heading',{name:'Sign in to UangFlow',exact:true}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Explore demo',exact:true}).click();await page.waitForFunction(()=>location.hash==='#dashboard');
 for(const [name,route] of [['Overview','dashboard'],['Transactions','transactions'],['Budgets','budget'],['Savings','goals'],['Money coach','coach'],['CSV import','imports'],['Settings','settings']]){
  if(name==='Settings')await page.getByRole('button',{name:/^Account menu/}).filter({visible:true}).click();
  const option=page.getByRole('button',{name,exact:true}).first();if(!await option.isVisible())await page.locator('.mobile-more summary').click();await option.click();await page.waitForFunction(hash=>location.hash===hash,'#'+route);
  copy.push(`\n--- ${route} ---\n`+await page.locator('main').innerText());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} fits mobile`);
 }
 assert.deepEqual(await page.evaluate(async()=>{const {localize}=await import('/i18n.js');const box=document.createElement('div');box.innerHTML='<strong data-user-content>Tabungan</strong><input value="Makanan"><p>Pengaturan</p>';localize(box);return [box.querySelector('strong').textContent,box.querySelector('input').value,box.querySelector('p').textContent];}),['Tabungan','Makanan','Settings']);
 await writeFile(`${out}/copy-review.txt`,copy.join('\n'));await page.goto(base+'/dana-android.html');await page.getByRole('heading',{name:'From notifications to records.',exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.deepEqual(errors,[]);
 console.log('PASS: default English, persistent Indonesian, supplied Pro prices, dropdown keyboard/bounds, disabled missing links, docs/resources/community routes, auth text, seven app screens and unchanged user data.');
}finally{await browser.close();}
