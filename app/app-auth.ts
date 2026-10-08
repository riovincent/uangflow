import {getChatGPTUser} from './chatgpt-auth';
import {authConfig} from './auth-config';

export async function getAppUser(request:Request) {
  const authorization=request.headers.get('authorization');
  if(authorization===null){const user=await getChatGPTUser();return user?{...user,provider:'chatgpt'}:null;}
  const config=authConfig();
  if(!config)throw Response.json({error:'Login email belum diaktifkan.'},{status:503});
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)||authorization.length>8192)throw Response.json({error:'Sesi tidak valid. Masuk kembali.'},{status:401});
  let response:Response;
  try{response=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,authorization},signal:AbortSignal.timeout(10000),cache:'no-store'});}
  catch{throw Response.json({error:'Layanan login belum dapat dihubungi. Coba lagi.'},{status:503});}
  if(!response.ok){const invalid=response.status===401||response.status===403;throw Response.json({error:invalid?'Sesi berakhir. Masuk kembali.':'Layanan login belum tersedia.'},{status:invalid?401:503});}
  let user;
  try{user=await response.json() as {id?:string;email?:string;email_confirmed_at?:string;user_metadata?:{full_name?:string}};}
  catch{throw Response.json({error:'Layanan login mengirim respons tidak valid.'},{status:503});}
  if(typeof user.id!=='string'||!user.id||typeof user.email!=='string'||!user.email||!user.email_confirmed_at)throw Response.json({error:'Verifikasi email Anda sebelum masuk.'},{status:401});
  return {userId:'supabase:'+user.id,email:user.email,displayName:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:user.email,provider:'supabase'};
}
