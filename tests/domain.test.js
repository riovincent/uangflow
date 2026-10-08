import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amount,blank,transaction,validateLinks,summary,parseCSV,csvExport,duplicate,save,load,demo,KEY,validDate} from '../public/domain.js';
const date='2026-10-08';
const tx=(extra={})=>transaction({id:crypto.randomUUID(),date,amount:25000,type:'expense',description:'Makan',category:'Makanan',status:'completed',reference:'',source:'manual',...extra});
test('integer rupiah rejects fractions, unsafe values and coercion',()=>{
  assert.equal(amount('25000'),25000);
  for(const value of ['25.5','1e3','-1','1,000','',null,Infinity,1_000_000_001])assert.throws(()=>amount(value));
  assert.equal(validDate('2026-02-30'),false);
});
test('spending excludes transfers, topups, pending, failed and future entries',()=>{
  const s=blank();s.settings={opening:100000,openingDate:date,nextDate:'2026-10-18',cycle:'monthly'};
  s.transactions=[tx(),tx({type:'transfer',amount:40000}),tx({status:'pending'}),tx({status:'failed'}),tx({date:'2026-10-09'})];
  const result=summary(s,date);assert.equal(result.available,75000);assert.equal(result.monthly('2026-10'),25000);assert.equal(result.daily,7500);
});
test('refund offsets cash and category, limited to original expense',()=>{
  const original=tx();const refund=tx({type:'refund',amount:10000,refundOf:original.id,category:'Lainnya'});
  validateLinks(refund,[original]);assert.equal(refund.category,'Makanan');
  const s=blank();s.settings.opening=100000;s.settings.openingDate=date;s.transactions=[original,refund];
  assert.equal(summary(s,date).available,85000);assert.equal(summary(s,date).categories.Makanan,15000);
  assert.throws(()=>validateLinks(tx({type:'refund',amount:20000,refundOf:original.id}),[original,refund]));
});
test('paid bill not reserved twice and refund restores reservation',()=>{
  const s=blank();s.settings.opening=100000;s.settings.openingDate=date;s.bills=[{id:'bill',name:'Internet',amount:25000,due:date}];
  const paid=tx({billId:'bill',category:'Tagihan'});s.transactions=[paid];
  let result=summary(s,date);assert.equal(result.available,75000);assert.equal(result.remainingBills,0);assert.equal(result.flexible,75000);
  s.transactions.push(tx({type:'refund',refundOf:paid.id,amount:10000,category:'Tagihan'}));
  result=summary(s,date);assert.equal(result.available,85000);assert.equal(result.remainingBills,10000);assert.equal(result.flexible,75000);
});
test('savings contributions reduce available but not spending or reservations twice',()=>{
  const s=blank();s.settings.opening=100000;s.settings.openingDate=date;s.goals=[{id:'goal',name:'Laptop',target:100000,existing:10000,reserve:30000,date:'2026-12-01'}];
  s.transactions=[tx({type:'transfer',amount:20000,goalId:'goal'})];
  const r=summary(s,date);assert.equal(r.available,80000);assert.equal(r.remainingSavings,10000);assert.equal(r.flexible,70000);assert.equal(r.goalSaved(s.goals[0]),30000);assert.equal(r.monthly('2026-10'),0);
});
test('shortfall is distinct from zero daily allowance; missing date stays unknown',()=>{
  const s=blank();s.settings={opening:100,openingDate:date,nextDate:'2026-10-18',cycle:'monthly'};s.bills=[{id:'b',name:'Bill',amount:200,due:date}];
  assert.equal(summary(s,date).flexible,-100);assert.equal(summary(s,date).daily,0);
  s.settings.nextDate='';assert.equal(summary(s,date).daily,null);
});
test('CSV quoting, BOM, multiline, invalid rows, headers and duplicates',()=>{
  const text='\uFEFFdate,amount,type,description,category,status,reference\r\n2026-10-08,25000,expense,"Makan, \"\"siang\"\"\nbersama",Makanan,completed,ABC\r\n2026-02-30,x,bad,test,Makanan,completed,\r\n';
  const rows=parseCSV(text);assert.equal(rows.length,2);assert.equal(rows[0].raw.description,'Makan, "siang"\nbersama');assert.throws(()=>transaction(rows[1].raw));
  const value=transaction({...rows[0].raw,source:'csv'});assert.equal(duplicate(value,[value]),true);
  assert.throws(()=>parseCSV('wrong,header\n1,2'));assert.throws(()=>parseCSV('date,amount,type,description,category,status,reference\n"unfinished'));
  assert.match(csvExport([tx({description:'=SUM(1,2)'})]),/"'=SUM/);
  assert.equal(parseCSV(csvExport([tx()]))[0].raw.amount,'25000');
});
test('persistence roundtrip and demo never overwrite personal storage',()=>{
  const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
  const personal=blank();personal.transactions=[tx()];save(storage,personal);
  const preview=demo(date);preview.transactions[0].amount=1;
  assert.deepEqual(load(storage),personal);assert.equal(values.size,1);assert.ok(values.has(KEY));
  storage.setItem(KEY,'{broken');assert.throws(()=>load(storage));
});
test('server validation normalizes string amounts and rejects broken links',()=>{
  const s=blank();s.transactions=[tx()];s.transactions[0].amount='25000';
  assert.equal(load({getItem:()=>JSON.stringify(s)}).transactions[0].amount,25000);
  s.transactions[0].goalId='missing';assert.throws(()=>load({getItem:()=>JSON.stringify(s)}));
});
