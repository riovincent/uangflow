import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
const sqlite=new DatabaseSync(':memory:');
for(const table of ['records','dana_devices','dana_events'])sqlite.exec(`CREATE TABLE ${table}(user_id TEXT PRIMARY KEY)`);
let failCleanup=false;
const db={prepare(sql){let values;return {bind(...args){values=args;return this;},run(){return sqlite.prepare(sql).run(...values);}};},async batch(queries){if(failCleanup)throw Error('D1 unavailable');sqlite.exec('BEGIN');try{queries.forEach(query=>query.run());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
globalThis.__env={DB:db,SUPABASE_URL:'https://uangflow-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__env',shortCircuit:true};
  if(specifier==='../../../auth-config'||specifier==='../../../dana-store')return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
}});
const {POST}=await import('../app/api/account/delete/route.ts');
const owner='44444444-4444-4444-8444-444444444444',other='55555555-5555-4555-8555-555555555555';
const request=(data={confirmation:'HAPUS',email:'owner@example.test'},extra={})=>new Request('https://uangflow.test/api/account/delete',{method:'POST',headers:{origin:'https://uangflow.test','Content-Type':'application/json',authorization:'Bearer valid-token',...extra},body:JSON.stringify(data)});
const count=id=>sqlite.prepare('SELECT COUNT(*) n FROM records WHERE user_id=?').get('supabase:'+id).n;
test('account deletion validates requests, fails closed, scopes cleanup and permits retry',async()=>{
  for(const table of ['records','dana_devices','dana_events'])for(const id of [owner,other])sqlite.prepare(`INSERT INTO ${table}(user_id) VALUES(?)`).run('supabase:'+id);
  const original=globalThis.fetch;let mode='unavailable',calls=0;
  globalThis.fetch=async(url,options)=>{
    calls++;assert.equal(url,'https://uangflow-test.supabase.co/rest/v1/rpc/uangflow_delete_own_account');assert.equal(options.headers.authorization,'Bearer valid-token');
    assert.deepEqual(JSON.parse(options.body),{confirmation_email:'owner@example.test'},'Never pass a client-supplied user ID');
    if(mode==='unavailable')return Response.json({code:'PGRST202'},{status:404});
    if(mode==='recent')return Response.json({message:'recent_login_required'},{status:400});
    if(mode==='wrong-email')return Response.json({message:'email_confirmation_mismatch'},{status:400});
    if(mode==='invalid')return Response.json({user_id:'../other'});
    return Response.json({user_id:owner});
  };
  try{
    assert.equal((await POST(request(undefined,{origin:'https://evil.test'}))).status,403);
    assert.equal((await POST(request(undefined,{authorization:''}))).status,401);
    assert.equal((await POST(request({confirmation:'hapus',email:'owner@example.test'}))).status,400);
    assert.equal((await POST(request({confirmation:'HAPUS',email:'x'.repeat(5000)}))).status,413);
    assert.equal(calls,0);
    assert.equal((await POST(request())).status,503);assert.equal(count(owner),1);
    mode='recent';assert.equal((await POST(request())).status,403);assert.equal(count(owner),1);
    mode='wrong-email';assert.equal((await POST(request())).status,400);
    mode='invalid';assert.equal((await POST(request())).status,503);assert.equal(count(owner),1);
    mode='ok';failCleanup=true;const failed=await POST(request());assert.equal(failed.status,503);assert.equal((await failed.json()).cleanupPending,true);assert.equal(count(owner),1);
    failCleanup=false;assert.equal((await POST(request({confirmation:'HAPUS',email:'owner@example.test',userId:other}))).status,200);
    assert.equal(count(owner),0);assert.equal(count(other),1);
    for(const table of ['dana_devices','dana_events'])assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`).get('supabase:'+other).n,1);
    assert.equal((await POST(request())).status,200,'Remote deletion and local cleanup can be retried');
  }finally{globalThis.fetch=original;}
});
