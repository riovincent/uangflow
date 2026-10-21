import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {blank} from '../public/domain.js';
const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH||'@playwright/test');
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
const base=process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193',remote='https://uangflow-test.supabase.co',errors=[];
const id='33333333-3333-4333-8333-333333333333',user={id,email:'profile@example.test',email_confirmed_at:'2026-10-21',aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{full_name:'Profile User'},identities:[{identity_id:'google-old',id:'google-old',user_id:id,provider:'google',identity_data:{email:'profile@example.test'}}]};
const token=[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',exp:Date.now()/1000+3600},'signature'].map((v,i)=>i===2?v:Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
let uploads=0,removals=0,unlinks=0,deleteCalls=0,requestedEmail='',linkedUrl='';
page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
try{
 await page.route('**/api/auth-config',route=>reply(route,{url:remote,key:'sb_publishable_test',google:true}));
 await page.route('**/api/state',route=>reply(route,{user:{id:'supabase:'+id,name:user.user_metadata.username||user.user_metadata.full_name,email:user.email,provider:'supabase',authProvider:'google',avatarUrl:null},state:blank(),revision:0}));
 await page.route('**/api/dana',route=>reply(route,{device:null,events:[],count:0}));
 await page.route('**/api/account/delete',route=>{deleteCalls++;assert.equal(route.request().postDataJSON().confirmation,'HAPUS');assert.equal(route.request().postDataJSON().email,user.email);return reply(route,deleteCalls===1?{error:'Verifikasi ulang akun, lalu coba lagi.'}:{ok:true},deleteCalls===1?403:200);});
 await page.route(remote+'/**',route=>{
  const r=route.request(),url=new URL(r.url());
  if(r.method()==='OPTIONS')return reply(route,{});
  if(url.pathname.endsWith('/token'))return reply(route,{access_token:token,refresh_token:'profile-refresh',expires_in:3600,token_type:'bearer',user});
  if(url.pathname.endsWith('/user')){
   if(r.method()==='PUT'){const body=r.postDataJSON();if(body.data)Object.assign(user.user_metadata,body.data);if(body.email){requestedEmail=body.email;user.new_email=body.email;}}
   return reply(route,user);
  }
  if(url.pathname.includes('/user/identities/authorize')){linkedUrl=r.url();return reply(route,{url:remote+'/identity-handoff'});}
  if(url.pathname.endsWith('/identity-handoff'))return route.fulfill({contentType:'text/html',body:'Identity handoff'});
  if(url.pathname.includes('/user/identities/')&&r.method()==='DELETE'){unlinks++;user.identities=user.identities.filter(i=>!url.pathname.endsWith(i.identity_id));return reply(route,{});}
  if(url.pathname.startsWith('/storage/v1/object/avatars/')){uploads++;assert.ok(url.pathname.endsWith(id+'/profile.webp'));return reply(route,{Key:'avatars/'+id+'/profile.webp'});}
  if(url.pathname==='/storage/v1/object/avatars'&&r.method()==='DELETE'){removals++;assert.deepEqual(r.postDataJSON().prefixes,[id+'/profile.webp']);return reply(route,[]);}
  if(url.pathname.endsWith('/recover')||url.pathname.endsWith('/logout'))return reply(route,{});
  throw Error('Unexpected profile endpoint: '+r.method()+' '+url.pathname);
 });
 await context.addInitScript(({token,user})=>localStorage.setItem('sb-uangflow-test-auth-token',JSON.stringify({access_token:token,refresh_token:'profile-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),{token,user});
 await page.goto(base+'/#dashboard');await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();
 await page.getByRole('button',{name:/^Menu akun/}).filter({visible:true}).click();assert.equal(await page.locator('#account-menu [data-action=switch-account]').count(),1);assert.equal(await page.locator('#account-menu .account-option[data-action=switch-account]').count(),0);
 await page.getByRole('button',{name:'Profil',exact:true}).click();await page.locator('#profile-name-form').waitFor({timeout:8000}).catch(async error=>{console.log('Profile diagnostic:',await page.locator('#modal').textContent(),errors);throw error;});
 assert.equal(await page.locator('[data-profile-action=unlink]').isDisabled(),true,'Only identity cannot be detached');
 await page.locator('[name=username]').fill('New <name>');await page.getByRole('button',{name:'Simpan username',exact:true}).click();await page.getByText('Username berhasil disimpan.',{exact:true}).waitFor();
 assert.equal(await page.locator('.account strong').textContent(),'New <name>');assert.equal(await page.locator('.account-email').textContent(),user.email);assert.equal(await page.locator('.account name').count(),0);
 await page.locator('#profile-email-form [name=email]').fill('new@example.test');await page.getByRole('button',{name:'Ubah email',exact:true}).click();await page.getByText('Permintaan perubahan email dikirim.',{exact:false}).waitFor();assert.equal(requestedEmail,'new@example.test');assert.equal(await page.locator('.account-email').textContent(),'profile@example.test','No optimistic change before email confirmation');
 await page.locator('[name=photo]').setInputFiles({name:'blocked.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await page.getByRole('button',{name:'Simpan foto',exact:true}).click();await page.getByText('Gunakan PNG, JPG atau WebP maksimal 3 MB.',{exact:true}).waitFor();assert.equal(uploads,0);
 await page.locator('[name=photo]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:await readFile('public/favicon.png')});await page.getByRole('button',{name:'Simpan foto',exact:true}).click();await page.getByText('Foto profil berhasil disimpan.',{exact:true}).waitFor();assert.equal(uploads,1);assert.equal(user.user_metadata.profile_avatar_path,id+'/profile.webp');
 await page.getByRole('button',{name:'Tautkan / ganti akun Google',exact:true}).click();await page.waitForURL(remote+'/identity-handoff');assert.equal(new URL(linkedUrl).searchParams.get('provider'),'google');assert.equal(new URL(linkedUrl).searchParams.get('prompt'),'select_account');
 user.identities.push({identity_id:'google-new',id:'google-new',user_id:id,provider:'google',identity_data:{email:'second-google@example.test'}});
 await page.goto(base+'/?code=google-code#dashboard');await page.locator('#profile-name-form').waitFor();
 await page.locator('[data-identity=google-old]').click();await page.locator('[data-identity=google-old]').waitFor({state:'detached'});await page.locator('.linked-identity').filter({hasText:'second-google@example.test'}).waitFor();assert.equal(unlinks,1);assert.equal(await page.locator('[data-profile-action=unlink]').isDisabled(),true);
 for(const width of [1440,390]){await page.setViewportSize({width,height:844});assert.equal(await page.locator('#modal').evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);}
 await page.locator('.profile-danger summary').click();await page.locator('#profile-delete-form [name=email]').fill('wrong@example.test');await page.locator('[name=confirmation]').fill('HAPUS');await page.getByRole('button',{name:'Hapus akun permanen',exact:true}).click();await page.getByText('Ketik HAPUS dan email akun yang sesuai.',{exact:true}).waitFor();assert.equal(deleteCalls,0);
 await page.locator('#profile-delete-form [name=email]').fill(user.email);await page.getByRole('button',{name:'Hapus akun permanen',exact:true}).click();await page.getByText('Verifikasi ulang akun, lalu coba lagi.',{exact:true}).waitFor();assert.equal(await page.locator('#modal').isVisible(),true,'Failure keeps the confirmation and retry');
 await page.getByRole('button',{name:'Hapus akun permanen',exact:true}).click();await page.getByRole('button',{name:'Masuk / Daftar',exact:true}).waitFor();assert.equal(deleteCalls,2);assert.ok(removals>=2);assert.deepEqual(errors,[]);
 console.log('PASS: profile name escaping, pending email confirmation, image validation/upload, Google link/unlink guard, responsive dialog, typed delete confirmation and failure/retry (mock services).');
}finally{await browser.close();}
