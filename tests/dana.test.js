import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {blank,load,summary} from '../public/domain.js';
import {notification} from '../public/dana.js';
const event=(text='Pembayaran Rp25.000 berhasil di Toko',n=1)=>({packageName:'id.dana',eventId:n.toString(16).padStart(64,'0'),postedAt:Date.now(),title:'DANA',text});
test('notification money/status/privacy boundaries; uncertain formats never count',()=>{
  assert.equal(notification(event()).tx.amount,25000);
  assert.equal(notification(event('Payment successfully completed IDR 125000')).tx.amount,125000);
  for(const text of ['Pembayaran Rp25.000 gagal','Pembayaran belum berhasil Rp25.000','Pembayaran berhasil diterima Rp25.000','Pembayaran berhasil Rp25.000 saldo Rp100.000','Pembayaran sukses Rp25,000','Pembayaran berhasil Rp25.000,50','Pembayaran berhasil Rp-25000','Promo pembayaran sukses Rp25.000','Pembayaran sukses Rp1000000001','Pembayaran diproses Rp25.000','Pembayaran berhasil Rp25.000 biaya Rp500','Pembayaran refund sukses Rp25.000'])assert.equal(notification(event(text)).tx,null,text);
  assert.equal(notification(event('OTP pembayaran 123456')),null);
  assert.equal(notification(event('Isi saldo Rp25.000 berhasil')).tx,null);
  assert.equal(notification(event('Transfer sukses Rp25.000')).tx,null);
  assert.equal(notification(event('Rp 50.00 terkirim kepada [nama]')).tx,null);
  assert.equal(notification(event('Rp 50.000 terkirim kepada [nama]')).tx,null,'recipient ownership is not assumed');
  assert.equal(notification(event('OTP Rp 50.00 terkirim kepada [nama]')),null);
  for(const phrase of ['Rp50.000 dikirim','Uang keluar Rp50.000','Pengeluaran Rp50.000','Pemasukan Rp50.000','Pendapatan Rp50.000','Penghasilan Rp50.000','Rp50.000 dikirimkan','Terima uang Rp50.000','Rp50.000 ditransfer','Saldo bertambah Rp50.000','Debit Rp50.000','Credited IDR 50000','Cash in IDR 50000','Sent IDR 50000','Withdrawal IDR 50000','Pembelian Rp50.000']){
    const parsed=notification(event(phrase));assert.ok(parsed,phrase);assert.equal(parsed.tx,null,phrase+' needs explicit verified direction');
  }
  for(const phrase of ['OTP uang masuk 123456','PIN debit 123456','Kode verifikasi transfer 123456'])assert.equal(notification(event(phrase)),null,phrase);
  for(const phrase of ['Payment completed credited IDR 50000','Pembayaran sukses pemasukan Rp50.000','Kamu menerima Rp50.000 debit','Kamu menerima Rp50.000 pengeluaran','Pembayaran berhasil ditolak Rp50.000','Payment completed declined IDR 50000','Pembayaran sukses dibatalkan Rp50.000'])assert.equal(notification(event(phrase)).tx,null,phrase);
  assert.ok(!notification(event('Pembayaran ke 081234567890 Rp25.000 berhasil')).message.includes('081234567890'));
  assert.throws(()=>notification({...event(),packageName:'other'}));
  assert.throws(()=>notification({...event(),eventId:'bad'}));
  assert.throws(()=>notification({...event(),postedAt:Date.now()-8*86400000}));
  assert.throws(()=>notification({...event(),postedAt:Date.now()+600000}));
});
test('incoming money needs clear direction; mixed, self-transfer and incomplete messages require review',()=>{
  for(const text of ['Kamu menerima Rp50.000 dari teman','Anda telah menerima Rp50.000','You have received IDR 50000','Uang masuk Rp50.000 berhasil']){
    const tx=notification(event(text)).tx;assert.equal(tx.type,'income',text);assert.equal(tx.amount,50000);assert.equal(tx.description,'Pemasukan DANA');
  }
  for(const text of ['Uang masuk Rp50.000','Kamu menerima Rp50.000 gagal','Kamu belum menerima Rp50.000','Kamu akan menerima Rp50.000','You have not received IDR 50000','Kamu menerima Rp50.000 cashback','Transfer masuk Rp50.000 berhasil','Isi saldo Rp50.000 berhasil','Kamu menerima refund Rp50.000','Kamu menerima Rp50.000 dan mengirim Rp10.000','Pembayaran sukses. Kamu menerima Rp50.000','Kamu menerima Rp50.000 saldo Rp100.000','Kamu menerima Rp50,000','Kamu mengirim Rp5.000 berhasil','Received Rp50.000','Promo uang masuk Rp50.000 berhasil'])assert.equal(notification(event(text)).tx,null,text);
  assert.equal(notification(event('Kamu menerima OTP 123456 Rp50.000')),null);
});
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
function prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}
globalThis.__env={DB:{prepare,async batch(queries){sqlite.exec('BEGIN');try{const result=queries.map(q=>q.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}}};
globalThis.__user=null;
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__env;',shortCircuit:true};
  if(specifier==='./chatgpt-auth')return {url:'data:text/javascript,export async function getChatGPTUser(){return globalThis.__user}',shortCircuit:true};
  if(/(?:app-auth|auth-config|dana-store)$/.test(specifier))return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
}});
const connection=await import('../app/api/dana/route.ts'),ingest=await import('../app/api/dana/notifications/route.ts'),state=await import('../app/api/state/route.ts');
const req=(path,method='GET',data,token,origin='https://uangflow.test')=>new Request('https://uangflow.test'+path,{method,headers:{...(method==='GET'?{}:{origin,'Content-Type':'application/json'}),...(token?{authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
const pair=async()=>{const r=await connection.POST(req('/api/dana','POST',{action:'pair'}));assert.equal(r.status,200);return (await r.json()).token;};
const send=(data,token)=>ingest.POST(req('/api/dana/notifications','POST',data,token));
const read=async()=> (await state.GET(req('/api/state'))).json();
test('device pairing, safe append, idempotency, review, isolation, revocation and financial reset',async()=>{
  assert.equal((await connection.GET(req('/api/dana'))).status,401);
  assert.equal((await send(event(),'bogus')).status,401);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'a@example.test'};
  assert.equal((await connection.POST(req('/api/dana','POST',{action:'pair'},null,'https://evil.test'))).status,403);
  const token=await pair();assert.match(token,/^uf_dana_[a-f0-9]{64}$/);
  assert.notEqual(sqlite.prepare('SELECT token_hash FROM dana_devices').get().token_hash,token);
  assert.equal((await ingest.GET(req('/api/dana/notifications','GET',undefined,token))).status,200);
  const opening=blank();opening.settings.opening=100000;assert.equal((await state.PUT(req('/api/state','PUT',{state:opening,revision:0}))).status,200);
  const first=event();assert.equal((await (await send(first,token)).json()).status,'recorded');
  assert.equal((await (await send(first,token)).json()).status,'recorded');
  let saved=await read();assert.equal(saved.state.transactions.length,1);assert.equal(saved.state.settings.opening,100000);assert.equal(saved.revision,2);
  assert.equal(load({getItem:()=>JSON.stringify(saved.state)}).transactions[0].source,'dana');
  assert.equal((await state.PUT(req('/api/state','PUT',{state:opening,revision:1}))).status,409,'phone append cannot be erased by a stale browser');
  const uncertain=event('Pembayaran Rp25,000 berhasil',2);
  assert.equal((await (await send(uncertain,token)).json()).status,'review');assert.equal((await read()).state.transactions.length,1);
  const list=await (await connection.GET(req('/api/dana'))).json();assert.equal(list.count,1);assert.equal(list.events[0].event_id,uncertain.eventId);assert.ok(!JSON.stringify(list).includes('token_hash'));
  globalThis.__user={userId:'bob',displayName:'Bob',email:'b@example.test'};
  const other=await pair();assert.equal((await (await connection.GET(req('/api/dana'))).json()).count,0);
  assert.equal((await connection.POST(req('/api/dana','POST',{action:'review',type:'expense',eventId:uncertain.eventId,date:list.events[0].date,amount:25000,description:'Forged',category:'Lainnya'}))).status,409);
  assert.equal((await read()).state.transactions.length,0);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'a@example.test'};
  assert.equal((await connection.POST(req('/api/dana','POST',{action:'review',type:'expense',eventId:uncertain.eventId,date:list.events[0].date,amount:-1,description:'Lunch',category:'Makanan'}))).status,400);
  assert.equal((await connection.POST(req('/api/dana','POST',{action:'review',type:'expense',eventId:uncertain.eventId,date:list.events[0].date,amount:25000,description:'Lunch',category:'Makanan'}))).status,200);
  assert.equal((await read()).state.transactions.length,2);await send(uncertain,token);assert.equal((await read()).state.transactions.length,2);
  const failed=event('Pembayaran gagal Rp25.000',3);await send(failed,token);await connection.POST(req('/api/dana','POST',{action:'ignore',eventId:failed.eventId}));await send(failed,token);assert.equal((await read()).state.transactions.length,2);assert.equal(sqlite.prepare('SELECT message FROM dana_events WHERE user_id=? AND event_id=?').get('alice',failed.eventId).message,'');
  const replacement=await pair();assert.equal((await send(event('Pembayaran berhasil Rp10000',4),token)).status,401);
  assert.equal((await send({...event(),packageName:'evil'},replacement)).status,400);
  assert.equal((await send({...event(),text:'a'.repeat(5000)},replacement)).status,413);
  saved=await read();saved.state.transactions=[];assert.equal((await state.PUT(req('/api/state','PUT',{state:saved.state,revision:saved.revision}))).status,200);await send(first,replacement);assert.equal((await read()).state.transactions.length,0,'deletion is not undone by notification retry');
  assert.equal((await state.PUT(req('/api/state','PUT',{state:blank(),revision:0,resetIntegrations:true}))).status,409);assert.equal((await ingest.GET(req('/api/dana/notifications','GET',undefined,replacement))).status,200,'stale reset cannot revoke connection');
  saved=await read();assert.equal((await state.PUT(req('/api/state','PUT',{state:blank(),revision:saved.revision,resetIntegrations:true}))).status,200);assert.equal((await send(event(),replacement)).status,401);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM dana_events WHERE user_id=?').get('alice').n,0);
  assert.equal((await ingest.GET(req('/api/dana/notifications','GET',undefined,other))).status,200,'reset leaves other accounts alone');
});
test('income append and review preserve balance, deduplication and explicit transfer classification',async()=>{
  globalThis.__user={userId:'income-user',displayName:'Income',email:'income@example.test'};
  const token=await pair(),first=event('Kamu menerima Rp50.000 dari teman',101);
  assert.equal((await (await send(first,token)).json()).status,'recorded');
  await send(first,token);
  let saved=await read();assert.equal(saved.state.transactions.length,1);assert.equal(saved.state.transactions[0].type,'income');assert.equal(summary(saved.state).available,50000);
  const transfer=event('Transfer masuk Rp50.000 berhasil',102);assert.equal((await (await send(transfer,token)).json()).status,'review');
  const data={action:'review',eventId:transfer.eventId,date:saved.state.transactions[0].date,amount:50000,description:'Dari rekening sendiri',category:'Lainnya'};
  for(const type of [undefined,'bogus','refund'])assert.equal((await connection.POST(req('/api/dana','POST',{...data,type}))).status,400);
  assert.equal((await read()).state.transactions.length,1);
  assert.equal((await connection.POST(req('/api/dana','POST',{...data,type:'transfer'}))).status,200);
  saved=await read();assert.equal(summary(saved.state).available,50000);assert.equal(saved.state.transactions[1].type,'transfer');
  const unclear=event('Uang masuk Rp25,000 berhasil',103);await send(unclear,token);
  assert.equal((await connection.POST(req('/api/dana','POST',{...data,eventId:unclear.eventId,type:'income',amount:25000,description:'Pemasukan diperiksa'}))).status,200);
  await send(unclear,token);saved=await read();assert.equal(saved.state.transactions.length,3);assert.equal(summary(saved.state).available,75000);
});
test('reported terkirim notification reaches review without guessing money or duplicating a replay',async()=>{
  globalThis.__user={userId:'reported-notification',displayName:'Reported',email:'reported@example.test'};
  const token=await pair(),notice=event('Rp 50.00 terkirim kepada [nama]',201);
  assert.equal((await (await send(notice,token)).json()).status,'review');await send(notice,token);
  const list=await (await connection.GET(req('/api/dana'))).json();assert.equal(list.count,1);assert.match(list.events[0].message,/Rp 50\.00 terkirim/);
  assert.equal((await read()).state.transactions.length,0);
  const review={action:'review',eventId:notice.eventId,type:'expense',date:list.events[0].date,amount:50000,category:'Lainnya',description:'Nominal diperiksa dengan bukti'};
  assert.equal((await connection.POST(req('/api/dana','POST',review))).status,200);await send(notice,token);
  const saved=await read();assert.equal(saved.state.transactions.length,1);assert.equal(saved.state.transactions[0].amount,50000);
});
