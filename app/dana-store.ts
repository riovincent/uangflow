import {env} from 'cloudflare:workers';
import {blank} from '../public/domain.js';
export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function body(request:Request):Promise<any>{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw json({error:'Gunakan JSON.'},415);
  const reader=request.body?.getReader();if(!reader)throw json({error:'Data kosong.'},400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000){await reader.cancel();throw json({error:'Data terlalu besar.'},413);}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(data));}catch{throw json({error:'JSON tidak valid.'},400);}
}
export async function hash(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
// D1 batches are atomic. Append to the current state so a phone never overwrites browser edits.
export async function record(userId:string,eventId:string,tx:object,tokenHash:string|null=null){
  if(!env.DB)throw Error('Database unavailable');
  const now=new Date().toISOString();
  const result=await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO records (user_id,state,revision,updated_at) VALUES (?,?,0,?)').bind(userId,JSON.stringify(blank()),now),
    env.DB.prepare(`UPDATE records SET state=json_insert(state,'$.transactions[#]',json(?)),revision=revision+1,updated_at=? WHERE user_id=? AND json_array_length(state,'$.transactions')<10000 AND length(state)<1900000 AND EXISTS(SELECT 1 FROM dana_events WHERE user_id=? AND event_id=? AND status='review') AND (? IS NULL OR EXISTS(SELECT 1 FROM dana_devices WHERE user_id=? AND token_hash=?))`).bind(JSON.stringify({...tx,id:'dana-'+eventId}),now,userId,userId,eventId,tokenHash,userId,tokenHash),
    env.DB.prepare(`UPDATE dana_events SET status='recorded' WHERE user_id=? AND event_id=? AND status='review' AND EXISTS(SELECT 1 FROM records,json_each(records.state,'$.transactions') t WHERE records.user_id=? AND json_extract(t.value,'$.id')=?)`).bind(userId,eventId,userId,'dana-'+eventId),
  ]);
  return result[1].meta.changes===1;
}
