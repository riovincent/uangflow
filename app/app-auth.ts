import {getChatGPTUser} from './chatgpt-auth';
import {authConfig} from './auth-config';

export async function getAppUser(request:Request) {
  const authorization=request.headers.get('authorization');
  if(authorization===null){const user=await getChatGPTUser();return user?{...user,provider:'chatgpt',authProvider:'chatgpt',avatarUrl:null}:null;}
  const config=authConfig();
  if(!config)throw Response.json({error:'Login email belum diaktifkan.'},{status:503});
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)||authorization.length>8192)throw Response.json({error:'Sesi tidak valid. Masuk kembali.'},{status:401});
  let response:Response;
  try{response=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,authorization},signal:AbortSignal.timeout(10000),cache:'no-store'});}
  catch{throw Response.json({error:'Layanan login belum dapat dihubungi. Coba lagi.'},{status:503});}
  if(!response.ok){const invalid=response.status===401||response.status===403;throw Response.json({error:invalid?'Sesi berakhir. Masuk kembali.':'Layanan login belum tersedia.'},{status:invalid?401:503});}
  let user;
  try{user=await response.json() as {id?:string;email?:string;email_confirmed_at?:string;app_metadata?:{provider?:string};user_metadata?:{username?:string;full_name?:string;avatar_url?:string;profile_avatar_path?:string}};}
  catch{throw Response.json({error:'Layanan login mengirim respons tidak valid.'},{status:503});}
  if(typeof user.id!=='string'||!user.id||typeof user.email!=='string'||!user.email||!user.email_confirmed_at)throw Response.json({error:'Verifikasi email Anda sebelum masuk.'},{status:401});
  const photo=user.user_metadata?.avatar_url;
  let avatarUrl=typeof photo==='string'&&photo.length<=2048&&/^https:\/\/lh[3-6]\.googleusercontent\.com\/[^\s<>"']+$/.test(photo)?photo:null;
  const path=user.user_metadata?.profile_avatar_path;
  if(path===user.id+'/profile.webp'){
    try{
      const signed=await fetch(config.url+'/storage/v1/object/sign/avatars/'+path,{method:'POST',headers:{apikey:config.key,authorization,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600}),signal:AbortSignal.timeout(5000)});
      const data=await signed.json() as {signedURL?:string};
      if(signed.ok&&data.signedURL?.startsWith('/object/sign/avatars/'+path+'?'))avatarUrl=config.url+'/storage/v1'+data.signedURL;
    }catch{/* Keep the Google photo or initials if storage is temporarily unavailable. */}
  }
  const name=user.user_metadata?.username||user.user_metadata?.full_name;
  return {userId:'supabase:'+user.id,email:user.email,displayName:typeof name==='string'&&name.trim()?name.trim().slice(0,80):user.email,provider:'supabase',authProvider:user.app_metadata?.provider==='google'?'google':'email',avatarUrl};
}
