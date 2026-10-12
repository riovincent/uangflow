import {env} from 'cloudflare:workers';
import {getAppUser} from '../../app-auth';
// Shared validation keeps browser imports and API writes on the same rules.
import {blank,load} from '../../../public/domain.js';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request) {
  let user;try{user=await getAppUser(request);}catch(error){if(error instanceof Response)return error;return json({error:'Sesi tidak dapat dimuat.'},503);}
  if(!user)return json({user:null,state:blank(),revision:0});
  try {
    if(!env.DB)return json({error:'Penyimpanan belum tersedia.'},503);
    const row=await env.DB.prepare('SELECT state,revision FROM records WHERE user_id=?').bind(user.userId).first<{state:string;revision:number}>();
    return json({user:{id:user.userId,name:user.displayName,email:user.email,provider:user.provider},state:row?load({getItem:()=>row.state}):blank(),revision:row?.revision??0});
  }catch {return json({error:'Data tidak dapat dimuat. Silakan coba lagi; data Anda tidak dihapus.'},503);}
}
export async function PUT(request:Request) {
  let user;try{user=await getAppUser(request);}catch(error){if(error instanceof Response)return error;return json({error:'Sesi tidak dapat dimuat.'},503);}
  if(!user)return json({error:'Masuk terlebih dahulu.'},401);
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)return json({error:'Asal permintaan tidak sesuai.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Format permintaan tidak sesuai.'},415);
    let body:{revision:number;state:ReturnType<typeof blank>;resetIntegrations?:boolean};
  try {
    const reader=request.body?.getReader();if(!reader)return json({error:'Data kosong.'},400);
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();return json({error:'Data terlalu besar.'},413);}chunks.push(value);}
    const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
    body=JSON.parse(new TextDecoder().decode(data));
    if(!Number.isSafeInteger(body.revision)||body.revision<0)return json({error:'Versi data tidak valid.'},400);
      if(body.resetIntegrations!==undefined&&typeof body.resetIntegrations!=='boolean')return json({error:'Pilihan reset tidak valid.'},400);
    body.state=load({getItem:()=>JSON.stringify(body.state)});
  }catch{return json({error:'Data tidak valid. Periksa nominal, tanggal, dan hubungan transaksi.'},400);}
  try {
    if(!env.DB)return json({error:'Penyimpanan belum tersedia.'},503);
    const now=new Date().toISOString();
    const result=await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO records (user_id,state,revision,updated_at) VALUES (?,?,0,?)').bind(user.userId,JSON.stringify(blank()),now),
      env.DB.prepare('UPDATE records SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(body.state),now,user.userId,body.revision),
        ...(body.resetIntegrations?['dana_devices','dana_events'].map(table=>env.DB!.prepare(`DELETE FROM ${table} WHERE user_id=? AND EXISTS(SELECT 1 FROM records WHERE user_id=? AND revision=? AND updated_at=? AND state=?)`).bind(user.userId,user.userId,body.revision+1,now,JSON.stringify(body.state))):[]),
    ]);
    if(result[1].meta.changes!==1)return json({error:'Data berubah di perangkat lain. Unduh salinan perubahan Anda lalu muat ulang sebelum mencoba lagi.'},409);
    return json({revision:body.revision+1});
  }catch{return json({error:'Gagal menyimpan. Perubahan belum tersimpan; coba kembali.'},503);}
}
