import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as payment from '../app/v1.0/debit/notify/route.ts';
import * as bank from '../app/v1.0/debit/emoney/transfer-bank/notify.htm/route.ts';
import * as redirect from '../app/api/dana/sandbox/return/route.ts';

test('sandbox registration endpoints never accept unverified financial callbacks',async()=>{
  for(const [handler,code] of [[payment,'5005601'],[bank,'5004301']]){
    const request=new Request('https://uangflow.org/notify?token=private-test-marker',{method:'POST',headers:{'Content-Type':'application/json','X-SIGNATURE':'forged'},body:JSON.stringify({latestTransactionStatus:'00',amount:{value:'5000.00',currency:'IDR'},userId:'another-user'})});
    const response=handler.POST(request);
    assert.equal(response.status,503);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.deepEqual(await response.json(),{responseCode:code,responseMessage:'Sandbox integration not configured'});
    const health=handler.GET();assert.equal(health.status,200);assert.equal((await health.json()).canSync,false);
  }
});
test('sandbox redirect drops auth codes and never claims the account is connected',async()=>{
  const response=redirect.GET(new Request('https://uangflow.org/api/dana/sandbox/return?authCode=private-test-marker&state=forged&responseCode=2001000'));
  assert.equal(response.status,303);
  assert.equal(response.headers.get('Location'),'https://uangflow.org/dana-sandbox.html');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(await response.text(),'');
  const page=readFileSync('public/dana-sandbox.html','utf8');assert.ok(page.includes('Akun belum terhubung'));assert.ok(!page.includes('private-test-marker'));
});
