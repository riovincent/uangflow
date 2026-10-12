import {env} from 'cloudflare:workers';
import {body,hash,json,record} from '../../../dana-store';
import {notification} from '../../../../public/dana.js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const token=request.headers.get('authorization')?.match(/^Bearer (uf_dana_[a-f0-9]{64})$/)?.[1];
    if(!token)return json({error:'Kunci perangkat diperlukan.'},401);
    if(!env.DB)return json({error:'Penyimpanan belum tersedia.'},503);
    const device=await env.DB.prepare('SELECT user_id FROM dana_devices WHERE token_hash=?').bind(await hash(token)).first();
    return device?json({connected:true}):json({error:'Kunci tidak aktif. Buat kunci baru dari Pengaturan UangFlow.'},401);
  }catch{return json({error:'Koneksi belum bisa diperiksa.'},503);}
}
export async function POST(request:Request){
  try{
    const token=request.headers.get('authorization')?.match(/^Bearer (uf_dana_[a-f0-9]{64})$/)?.[1];
    if(!token)return json({error:'Kunci perangkat diperlukan.'},401);
    if(!env.DB)return json({error:'Penyimpanan belum tersedia.'},503);
    const tokenHash=await hash(token);
    const device=await env.DB.prepare('SELECT user_id,created_at FROM dana_devices WHERE token_hash=?').bind(tokenHash).first<{user_id:string;created_at:string}>();
    if(!device)return json({error:'Koneksi perangkat sudah diputus. Hubungkan kembali.'},401);
    let event,data;try{data=await body(request);event=notification(data);}catch(e){return e instanceof Response?e:json({error:'Notifikasi tidak valid.'},400);}
    if(!event||data.postedAt<Date.parse(device.created_at)-300000)return json({status:'ignored'});
    const now=new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO dana_events(user_id,event_id,date,message,status,received_at) SELECT ?,?,?,?,'review',? WHERE EXISTS(SELECT 1 FROM dana_devices WHERE user_id=? AND token_hash=?) AND (SELECT COUNT(*) FROM dana_events WHERE user_id=?)<10000").bind(device.user_id,data.eventId,event.date,event.message,now,device.user_id,tokenHash,device.user_id),
      env.DB.prepare('UPDATE dana_devices SET last_seen=? WHERE user_id=? AND token_hash=?').bind(now,device.user_id,tokenHash),
    ]);
    if(event.tx)await record(device.user_id,data.eventId,event.tx,tokenHash);
    const saved=await env.DB.prepare('SELECT status FROM dana_events WHERE user_id=? AND event_id=?').bind(device.user_id,data.eventId).first<{status:string}>();
    if(!saved)return json({error:'Koneksi diputus atau kapasitas notifikasi penuh.'},409);
    return json({status:saved.status});
  }catch{return json({error:'Notifikasi belum tersimpan. Coba kembali.'},503);}
}
