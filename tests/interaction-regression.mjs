import assert from 'node:assert/strict';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193')+'/');
  await page.getByRole('button',{name:'Jelajahi demo',exact:true}).click();
  await page.waitForFunction(()=>location.hash==='#dashboard');
  await page.waitForTimeout(1400);
  const main=await page.locator('.workspace main').elementHandle();
  await page.locator('h1').click();
  assert.equal(await main.evaluate(node=>node.isConnected),true,'Clicking text must not navigate');
  assert.equal(await main.evaluate(node=>node.getAnimations().length),0,'Text clicks must not start zoom');
  await page.getByRole('button',{name:'Ringkasan',exact:true}).click();
  await page.waitForFunction(node=>!node.isConnected,main);
  assert.ok(await page.locator('h1 .motion-word').first().evaluate(node=>node.getAnimations().length)>0,'Option click replays words');
  await page.getByRole('button',{name:'Keluar demo',exact:true}).click();
  await page.locator('.hero').waitFor();
  for(const [width,height] of [[1440,900],[768,1024],[390,844],[470,604]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.locator('.card-symbol').evaluate(node=>node.clientHeight>=40),'The card must not squash the logo');
    assert.ok(await page.locator('.card-symbol').evaluate(node=>node.getBoundingClientRect().height>25),'Logo remains visible after responsive scaling');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),height);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: idle/text clicks never zoom, options replay words, and the logo stays complete at four viewport sizes.');
}finally{await browser.close();}
