import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {blank} from '../public/domain.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE records(user_id TEXT PRIMARY KEY,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)');
function prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){return sqlite.prepare(sql).get(...values);},run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}
globalThis.__env={DB:{prepare,async batch(queries){sqlite.exec('BEGIN');try{const result=queries.map(q=>q.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}}};
globalThis.__user=null;
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__env;',shortCircuit:true};
  if(specifier==='./chatgpt-auth')return {url:'data:text/javascript,export async function getChatGPTUser(){return globalThis.__user}',shortCircuit:true};
  if(specifier==='../../app-auth'||specifier==='./auth-config')return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
}});
const {GET,PUT}=await import('../app/api/state/route.ts');
const read=(token)=>GET(new Request('https://uangflow.test/api/state',{headers:token?{authorization:'Bearer '+token}:{}}));
const request=(data,origin='https://uangflow.test')=>new Request('https://uangflow.test/api/state',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('API auth, account isolation, persistence, CSRF, validation and stale writes',async()=>{
  let response=await PUT(request({state:blank(),revision:0}));assert.equal(response.status,401);
  assert.equal((await (await read()).json()).user,null);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
  const state=blank();state.settings.opening=750000;
  assert.equal((await PUT(request({state,revision:0}))).status,200);
  const saved=await (await read()).json();assert.equal(saved.state.settings.opening,750000);assert.equal(saved.revision,1);
  assert.equal((await PUT(request({state,revision:0}))).status,409);
  assert.equal((await PUT(request({state,revision:1},'https://evil.test'))).status,403);
  const invalid=structuredClone(state);invalid.settings.opening=-1;assert.equal((await PUT(request({state:invalid,revision:1}))).status,400);
  globalThis.__user={userId:'bob',displayName:'Bob',email:'bob@example.test'};
  const second=await (await read()).json();assert.equal(second.state.settings.opening,0);assert.equal(second.revision,0);
  assert.equal((await PUT(request({state:blank(),revision:0,userId:'alice'}))).status,200);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
  assert.equal((await (await read()).json()).state.settings.opening,750000);
  assert.equal((await PUT(request({state:blank(),revision:1}))).status,200);
  assert.equal((await (await read()).json()).state.settings.opening,0);
});
test('Supabase tokens require remote verification, confirmed email and distinct account ownership',async()=>{
  globalThis.__env.SUPABASE_URL='https://uangflow-test.supabase.co';
  globalThis.__env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  globalThis.__user={userId:'legacy',displayName:'Old account',email:'same@example.test'};
  const originalFetch=globalThis.fetch;
  let mode='valid',verifiedId='alice';
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://uangflow-test.supabase.co/auth/v1/user');
    assert.equal(options.headers.authorization,'Bearer test-token');
    assert.equal(options.headers.apikey,'sb_publishable_test');
    if(mode==='invalid')return new Response('{}',{status:401});
    if(mode==='offline')throw Error('Network unavailable');
    return Response.json({id:verifiedId,email:'same@example.test',email_confirmed_at:mode==='unconfirmed'?null:'2026-10-09',user_metadata:{full_name:'Verified user'}});
  };
  try{
    assert.equal((await read('bad token')).status,401);
    mode='invalid';assert.equal((await read('test-token')).status,401,'invalid token never falls back to ChatGPT');
    mode='offline';assert.equal((await read('test-token')).status,503);
    mode='unconfirmed';assert.equal((await read('test-token')).status,401);
    mode='valid';const account=await (await read('test-token')).json();assert.equal(account.user.id,'supabase:alice');assert.equal(account.user.provider,'supabase');
    const state=blank();state.settings.opening=123456;
    const write=request({state,revision:0,userId:'legacy'});write.headers.set('authorization','Bearer test-token');
    assert.equal((await PUT(write)).status,200);
    assert.equal((await (await read('test-token')).json()).state.settings.opening,123456);
    assert.equal((await (await read()).json()).state.settings.opening,0,'same email cannot take over old ChatGPT records');
    verifiedId='bob';assert.equal((await (await read('test-token')).json()).state.settings.opening,0);
    delete globalThis.__env.SUPABASE_PUBLISHABLE_KEY;assert.equal((await read('test-token')).status,503);
  }finally{globalThis.fetch=originalFetch;delete globalThis.__env.SUPABASE_URL;}
});
test('auth config exposes only an explicitly publishable key',async()=>{
  const {authConfig}=await import('../app/auth-config.ts');
  globalThis.__env.SUPABASE_URL='https://uangflow-test.supabase.co';
  for(const key of ['sb_secret_private','service-role-key',undefined]){
    globalThis.__env.SUPABASE_PUBLISHABLE_KEY=key;assert.equal(authConfig(),null);
  }
  globalThis.__env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  globalThis.__env.SUPABASE_GOOGLE_ENABLED='true';assert.equal(authConfig().google,true);
  globalThis.__env.SUPABASE_URL='http://evil.test';assert.equal(authConfig(),null);
  delete globalThis.__env.SUPABASE_URL;delete globalThis.__env.SUPABASE_PUBLISHABLE_KEY;
});
