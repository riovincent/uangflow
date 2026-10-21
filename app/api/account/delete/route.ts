import {env} from 'cloudflare:workers';
import {authConfig} from '../../../auth-config';
import {body,json} from '../../../dana-store';
export const dynamic='force-dynamic';

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Asal permintaan tidak sesuai.'},403);
    const authorization=request.headers.get('authorization');
    if(!authorization||!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)||authorization.length>8192)return json({error:'Masuk kembali sebelum menghapus akun.'},401);
    const input=await body(request);
    if(input?.confirmation!=='HAPUS'||typeof input.email!=='string'||input.email.length>254)return json({error:'Ketik HAPUS dan alamat email akunmu.'},400);
    const config=authConfig();if(!config||!env.DB)return json({error:'Layanan hapus akun belum tersedia.'},503);
    // The RPC verifies the JWT, recent login and email, and derives ownership from auth.uid().
    const remote=await fetch(config.url+'/rest/v1/rpc/uangflow_delete_own_account',{method:'POST',headers:{apikey:config.key,authorization,'Content-Type':'application/json'},body:JSON.stringify({confirmation_email:input.email}),signal:AbortSignal.timeout(15000)});
    const result=await remote.json() as {user_id?:string;code?:string;message?:string};
    if(!remote.ok){
      if(result.code==='PGRST202')return json({error:'Fitur hapus akun menunggu aktivasi di Supabase.'},503);
      if(result.message==='recent_login_required')return json({error:'Verifikasi ulang akun, lalu coba lagi.',reauthenticate:true},403);
      if(result.message==='email_confirmation_mismatch')return json({error:'Alamat email konfirmasi tidak sesuai.'},400);
      return json({error:'Akun belum dihapus. Periksa sesi lalu coba lagi.'},remote.status===401?401:503);
    }
    if(typeof result.user_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.user_id))return json({error:'Respons penghapusan tidak valid.'},503);
    const owner='supabase:'+result.user_id;
    try{await env.DB.batch(['dana_devices','dana_events','records'].map(table=>env.DB!.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(owner)));}
    catch{return json({error:'Akun login sudah dihapus, tetapi catatan belum selesai dibersihkan. Jangan tutup halaman ini; tekan Hapus akun lagi untuk mengulangi pembersihan.',cleanupPending:true},503);}
    return json({ok:true});
  }catch(error){return error instanceof Response?error:json({error:'Penghapusan belum selesai. Coba lagi; jangan tutup halaman ini.'},503);}
}
