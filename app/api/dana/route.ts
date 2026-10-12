import {env} from 'cloudflare:workers';
import {getAppUser} from '../../app-auth';
import {body,hash,json,record} from '../../dana-store';
import {transaction} from '../../../public/domain.js';
export const dynamic='force-dynamic';
async function user(request:Request){const u=await getAppUser(request);if(!u)throw json({error:'Masuk terlebih dahulu.'},401);if(!env.DB)throw json({error:'Penyimpanan belum tersedia.'},503);return u;}
export async function GET(request:Request){
  try{
    const u=await user(request);
    const device=await env.DB!.prepare('SELECT created_at,last_seen FROM dana_devices WHERE user_id=?').bind(u.userId).first();
    const events=await env.DB!.prepare("SELECT event_id,date,message FROM dana_events WHERE user_id=? AND status='review' ORDER BY received_at DESC LIMIT 100").bind(u.userId).all();
    const count=await env.DB!.prepare("SELECT COUNT(*) n FROM dana_events WHERE user_id=? AND status='review'").bind(u.userId).first<{n:number}>();
    return json({device,events:events.results,count:count?.n||0});
  }catch(e){return e instanceof Response?e:json({error:'Koneksi DANA belum bisa dimuat.'},503);}
}
export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Asal permintaan tidak sesuai.'},403);
    const u=await user(request),data=await body(request),now=new Date().toISOString();
    if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Data tidak valid.'},400);
    if(data.action==='pair'){
      const token='uf_dana_'+[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
      await env.DB!.prepare('INSERT INTO dana_devices(user_id,token_hash,created_at,last_seen) VALUES(?,?,?,NULL) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=excluded.created_at,last_seen=NULL').bind(u.userId,await hash(token),now).run();
      return json({token});
    }
    if(data.action==='revoke'){await env.DB!.prepare('DELETE FROM dana_devices WHERE user_id=?').bind(u.userId).run();return json({ok:true});}
    if(typeof data.eventId!=='string'||!/^[a-f0-9]{64}$/.test(data.eventId))return json({error:'ID notifikasi tidak valid.'},400);
    if(data.action==='ignore'){
      await env.DB!.prepare("UPDATE dana_events SET status='ignored',message='' WHERE user_id=? AND event_id=? AND status='review'").bind(u.userId,data.eventId).run();return json({ok:true});
    }
    if(data.action==='review'){
      if(!['expense','income','transfer'].includes(data.type))return json({error:'Pilih jenis pengeluaran, pemasukan, atau transfer.'},400);
      let tx;try{tx=transaction({date:data.date,amount:data.amount,type:data.type,status:'completed',category:data.category,description:data.description,reference:data.eventId,source:'dana'});}catch{return json({error:'Periksa nominal, tanggal, kategori, dan deskripsi.'},400);}
      if(!await record(u.userId,data.eventId,tx))return json({error:'Notifikasi sudah ditinjau atau tabel penuh. Muat ulang.'},409);
      return json({ok:true});
    }
    return json({error:'Tindakan tidak valid.'},400);
  }catch(e){return e instanceof Response?e:json({error:'Gagal menyimpan koneksi DANA. Coba kembali.'},503);}
}
