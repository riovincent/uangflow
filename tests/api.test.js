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
  if(specifier==='../../chatgpt-auth')return {url:'data:text/javascript,export async function getChatGPTUser(){return globalThis.__user}',shortCircuit:true};
  return next(specifier,context);
}});
const {GET,PUT}=await import('../app/api/state/route.ts');
const request=(data,origin='https://uangflow.test')=>new Request('https://uangflow.test/api/state',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('API auth, account isolation, persistence, CSRF, validation and stale writes',async()=>{
  let response=await PUT(request({state:blank(),revision:0}));assert.equal(response.status,401);
  assert.equal((await (await GET()).json()).user,null);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
  const state=blank();state.settings.opening=750000;
  assert.equal((await PUT(request({state,revision:0}))).status,200);
  const saved=await (await GET()).json();assert.equal(saved.state.settings.opening,750000);assert.equal(saved.revision,1);
  assert.equal((await PUT(request({state,revision:0}))).status,409);
  assert.equal((await PUT(request({state,revision:1},'https://evil.test'))).status,403);
  const invalid=structuredClone(state);invalid.settings.opening=-1;assert.equal((await PUT(request({state:invalid,revision:1}))).status,400);
  globalThis.__user={userId:'bob',displayName:'Bob',email:'bob@example.test'};
  const second=await (await GET()).json();assert.equal(second.state.settings.opening,0);assert.equal(second.revision,0);
  assert.equal((await PUT(request({state:blank(),revision:0,userId:'alice'}))).status,200);
  globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
  assert.equal((await (await GET()).json()).state.settings.opening,750000);
  assert.equal((await PUT(request({state:blank(),revision:1}))).status,200);
  assert.equal((await (await GET()).json()).state.settings.opening,0);
});
