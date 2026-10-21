const {chromium}=await import(process.env.UANGFLOW_PLAYWRIGHT_PATH || '@playwright/test');
import assert from 'node:assert/strict';
import {blank} from '../public/domain.js';
const base=process.env.UANGFLOW_BASE_URL||'http://127.0.0.1:5193',browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
  const plain=await browser.newPage({viewport:{width:390,height:844}});plain.on('pageerror',e=>errors.push(e.message));
  await plain.route('**/api/auth-config',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
  await plain.goto(base);await plain.getByRole('button',{name:'Masuk / Daftar',exact:true}).click();
  await plain.getByText('Login belum dapat dimuat.',{exact:false}).waitFor();
  assert.equal(await plain.getByRole('link',{name:'Lanjutkan dengan ChatGPT'}).count(),0);
  assert.equal(await plain.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await plain.close();

  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const supabase='https://uangflow-test.supabase.co';
  const id='11111111-1111-4111-8111-111111111111';
  const fakeUser={id,aud:'authenticated',role:'authenticated',email:'student@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{full_name:'Student'}};
  const token=[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iss:supabase+'/auth/v1'},'signature'].map((v,i)=>i===2?v:Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  let signupCalls=0,signupSession=false,resendCalls=0,recoveryCalls=0,passwordCalls=0,passwordUpdateCalls=0,googleUrl='',saved=blank(),revision=0;
  const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(body)});
  await page.route('**/api/auth-config',route=>reply(route,{url:supabase,key:'sb_publishable_test',google:true}));
  await page.route(supabase+'/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='OPTIONS')return reply(route,{});
    if(url.pathname.endsWith('/signup')){signupCalls++;assert.equal(request.postDataJSON().email,'student@example.test');return reply(route,signupSession?{access_token:token,refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user:fakeUser}:{user:{...fakeUser,email_confirmed_at:null},session:null});}
    if(url.pathname.endsWith('/resend')){resendCalls++;assert.equal(request.postDataJSON().type,'signup');assert.equal(request.postDataJSON().email,'student@example.test');assert.equal(url.searchParams.get('redirect_to'),base+'/');return reply(route,{});}
    if(url.pathname.endsWith('/recover')){recoveryCalls++;return reply(route,{});}
    if(url.pathname.endsWith('/token')){
      const body=request.postDataJSON();
      if(url.searchParams.get('grant_type')==='pkce')assert.ok(['recovery-code','google-code'].includes(body.auth_code));
      else{
      passwordCalls++;
      if(body.password!=='strong-password-123')return reply(route,{msg:'Invalid login credentials'},400);
      }
      return reply(route,{access_token:token,refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user:fakeUser});
    }
    if(url.pathname.endsWith('/user')){if(request.method()==='PUT'){passwordUpdateCalls++;assert.equal(request.postDataJSON().password,'updated-password-456');}return reply(route,fakeUser);}
    if(url.pathname.endsWith('/logout'))return reply(route,{});
    if(url.pathname.endsWith('/authorize')){googleUrl=request.url();return route.fulfill({contentType:'text/html',body:'Google OAuth handoff test'});}
    throw Error('Unexpected Auth endpoint: '+request.url());
  });
  await page.route('**/api/state',async route=>{
    const request=route.request(),signedIn=request.headers().authorization==='Bearer '+token;
    if(request.method()==='PUT'){
      assert.equal(signedIn,true,'writes carry the SDK token');
      const body=request.postDataJSON();saved=body.state;revision++;return reply(route,{revision});
    }
    return reply(route,{user:signedIn?{id:'supabase:'+fakeUser.id,name:fakeUser.user_metadata.full_name,email:fakeUser.email,provider:'supabase',authProvider:fakeUser.app_metadata.provider,avatarUrl:fakeUser.user_metadata.avatar_url||null}:null,state:signedIn?saved:blank(),revision:signedIn?revision:0});
  });
  await page.goto(base);await page.getByRole('button',{name:'Masuk / Daftar',exact:true}).click();await page.getByRole('button',{name:'Belum punya akun? Daftar',exact:true}).click();
  await page.locator('#auth-form [name=name]').fill('Student');await page.locator('#auth-form [name=email]').fill('student@example.test');
  await page.locator('#auth-form [name=password]').fill('strong-password-123');await page.locator('#auth-form [name=confirm]').fill('different-password-123');
  await page.getByRole('button',{name:'Daftar akun',exact:true}).click();await page.getByText('Kedua password harus sama.',{exact:true}).waitFor();assert.equal(signupCalls,0);
  await page.locator('#auth-form [name=confirm]').fill('strong-password-123');await page.getByRole('button',{name:'Daftar akun',exact:true}).click();
  await page.locator('.auth-message').filter({hasText:/email verifikasi/}).waitFor();assert.equal(signupCalls,1);
  assert.equal(await page.locator('#auth-form').getAttribute('data-mode'),'signin');assert.equal(await page.locator('#auth-form [name=email]').inputValue(),'student@example.test');
  await page.getByRole('button',{name:'Kirim ulang konfirmasi email',exact:true}).click();await page.getByRole('button',{name:'Kirim email konfirmasi',exact:true}).click();await page.getByText(/email verifikasi baru akan dikirim/).waitFor();assert.equal(resendCalls,1);
  await page.getByRole('button',{name:'Kembali ke halaman masuk'}).click();await page.getByRole('button',{name:'Lupa password?',exact:true}).click();
  await page.locator('#auth-form [name=email]').fill('student@example.test');await page.getByRole('button',{name:'Kirim tautan pemulihan'}).click();
  await page.locator('.auth-message').filter({hasText:/tautan pemulihan/}).waitFor();assert.equal(recoveryCalls,1);
  await page.getByRole('button',{name:'Kembali ke halaman masuk'}).click();
  await page.locator('#auth-form [name=email]').fill('student@example.test');await page.locator('#auth-form [name=password]').fill('wrong-password');
  await page.locator('#auth-form [type=submit]').click();await page.getByText('Email atau password tidak sesuai.',{exact:true}).waitFor();
  await page.locator('#auth-form [name=password]').fill('strong-password-123');await page.locator('#auth-form [type=submit]').click();
  await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();assert.equal(passwordCalls,2);assert.equal(await page.locator('.account strong').textContent(),'Student');assert.equal(await page.locator('.account-email').textContent(),fakeUser.email);assert.equal(saved.onboarded,false);assert.ok(await page.locator('.workspace main').evaluate(el=>el.getAnimations().some(a=>a.effect.getTiming().duration===1200)),'Login uses the longer zoom');
  for(const name of ['Ringkasan','Transaksi','Anggaran','Tabungan','Money coach','Impor CSV','Pengaturan']){if(name==='Pengaturan')await page.getByRole('button',{name:/^Menu akun/}).filter({visible:true}).click();await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(n=>document.querySelector('.topbar strong')?.textContent===n,name);assert.equal(await page.locator('.sidebar').count(),1);assert.equal(await page.locator('h1').count(),1);}
  await page.locator('[name=opening]').fill('100000');await page.getByRole('button',{name:'Mulai mencatat'}).click();
  await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();assert.equal(saved.settings.opening,100000);
  await page.reload();await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();
  await page.goto(base+'/?code=recovery-code');await page.getByRole('heading',{name:'Buat password baru',exact:true}).waitFor();
  await page.locator('#auth-form [name=password]').fill('updated-password-456');await page.locator('#auth-form [name=confirm]').fill('updated-password-456');await page.getByRole('button',{name:'Simpan password'}).click();
  await page.locator('#modal').waitFor({state:'hidden'});assert.equal(passwordUpdateCalls,1);
  await page.getByRole('button',{name:/^Menu akun/}).filter({visible:true}).click();await page.getByRole('button',{name:'Keluar',exact:true}).click();await page.getByRole('button',{name:'Masuk / Daftar',exact:true}).waitFor();
  await page.goto(base+'/?error=access_denied&error_code=otp_expired#error=access_denied&error_code=otp_expired');await page.getByRole('heading',{name:'Masuk ke UangFlow',exact:true}).waitFor();await page.getByText(/Tautan email tidak valid atau sudah kedaluwarsa/).waitFor();assert.equal(await page.locator('#auth-form [name=email]').count(),1);await page.getByRole('button',{name:'Tutup',exact:true}).click();
  signupSession=true;await page.getByRole('button',{name:'Masuk / Daftar',exact:true}).click();await page.getByRole('button',{name:'Belum punya akun? Daftar',exact:true}).click();await page.locator('#auth-form [name=name]').fill('Student');await page.locator('#auth-form [name=email]').fill('student@example.test');await page.locator('#auth-form [name=password]').fill('strong-password-123');await page.locator('#auth-form [name=confirm]').fill('strong-password-123');await page.getByRole('button',{name:'Daftar akun',exact:true}).click();await page.getByText('Pendaftaran selesai. Silakan masuk dengan akun barumu.',{exact:true}).waitFor();assert.equal(await page.locator('#auth-form').getAttribute('data-mode'),'signin');assert.equal(await page.evaluate(async()=>!!(await window.uangflowAuth.auth.getSession()).data.session),false);await page.getByRole('button',{name:'Tutup',exact:true}).click();
  await page.getByRole('button',{name:'Masuk / Daftar',exact:true}).click();
  await page.locator('#modal').evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  await page.screenshot({path:'outputs/experience/google-signin-ready.png'});
  await page.evaluate(()=>{window.restoreOAuth=window.uangflowAuth.auth.signInWithOAuth;window.uangflowAuth.auth.signInWithOAuth=async()=>({error:new Error('Google sementara tidak tersedia.')});});
  await page.getByRole('button',{name:'Lanjutkan dengan Google'}).click();
  await page.getByText('Google sementara tidak tersedia.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Lanjutkan dengan Google'}).isEnabled(),true);
  await page.evaluate(()=>{window.uangflowAuth.auth.signInWithOAuth=window.restoreOAuth;delete window.restoreOAuth;});
  await page.getByRole('button',{name:'Lanjutkan dengan Google'}).click();
  await page.waitForURL(supabase+'/**');assert.equal(new URL(googleUrl).searchParams.get('provider'),'google');assert.ok(new URL(googleUrl).searchParams.get('code_challenge'));assert.equal(new URL(googleUrl).searchParams.get('code_challenge_method'),'s256');
  assert.equal(new URL(googleUrl).searchParams.get('redirect_to'),base+'/#dashboard');
  fakeUser.app_metadata.provider='google';
  await page.goto(base+'/?code=google-code#dashboard');
  await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();
  assert.equal(new URL(page.url()).hash,'#dashboard');assert.equal(await page.locator('.account strong').textContent(),'Student');assert.equal(await page.locator('.account-email').textContent(),fakeUser.email);
  const enter=await page.locator('.workspace main').evaluate(node=>node.getAnimations().map(a=>a.effect.getTiming().duration));
  assert.ok(enter.includes(1200),'Verified Google callback uses the longer login zoom');
  await page.reload();await page.locator('.account-email').filter({hasText:fakeUser.email}).waitFor();
  const accountButton=()=>page.getByRole('button',{name:/^Menu akun/}).filter({visible:true});
  assert.equal(await page.locator('.date-pill').count(),0);
  assert.equal(await page.locator('.sidebar>nav [data-page=settings]').count(),0);
  await accountButton().click();await page.getByRole('dialog',{name:'Menu akun',exact:true}).waitFor();
  await page.keyboard.press('Escape');assert.equal(await page.locator('#account-menu').evaluate(el=>el.matches(':popover-open')),false);
  await accountButton().click();await page.getByRole('button',{name:'Profil',exact:true}).click();
  await page.getByRole('heading',{name:'Profil',exact:true}).waitFor();assert.equal(await page.locator('.profile-identity p').textContent(),fakeUser.email);await page.getByRole('button',{name:'Tutup',exact:true}).click();
  await accountButton().click();await page.getByRole('button',{name:'Upgrade',exact:true}).click();await page.getByText('Paket berbayar belum tersedia.',{exact:false}).waitFor();await page.getByRole('button',{name:'Mengerti',exact:true}).click();
  await accountButton().click();await page.getByRole('button',{name:'Bantuan',exact:true}).click();await page.waitForFunction(()=>location.hash==='#bantuan');
  await accountButton().click();await page.getByRole('button',{name:'Pengaturan',exact:true}).click();await page.waitForFunction(()=>location.hash==='#settings');
  for(const [width,height] of [[1440,900],[1024,600],[390,844]]){
    await page.setViewportSize({width,height});await accountButton().click();
    assert.equal(await page.locator('#account-menu').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),true,'Account menu fits viewport');
    await page.keyboard.press('Escape');
  }
  await accountButton().click();await page.getByRole('button',{name:'Ganti akun',exact:true}).click();await page.getByRole('heading',{name:'Masuk ke UangFlow',exact:true}).waitFor();
  assert.equal(await page.evaluate(async()=>!!(await window.uangflowAuth.auth.getSession()).data.session),false,'Switch ends only the current local session');
  await page.getByRole('button',{name:'Lanjutkan dengan Google'}).click();await page.waitForURL(supabase+'/**');assert.equal(new URL(googleUrl).searchParams.get('prompt'),'select_account');
  fakeUser.id='22222222-2222-4222-8222-222222222222';fakeUser.email='second@example.test';fakeUser.user_metadata.full_name='Second account';saved=blank();revision=0;
  fakeUser.user_metadata.avatar_url='https://lh3.googleusercontent.com/a/test-photo';
  await page.route('https://lh3.googleusercontent.com/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF3kAAAAASUVORK5CYII=','base64')}));
  await page.goto(base+'/?code=google-code#dashboard');await page.getByRole('heading',{name:'Lebih tenang, lebih terencana.'}).waitFor();
  assert.equal(await page.locator('.account strong').textContent(),'Second account');assert.equal(await page.locator('.hero-amount').textContent().then(t=>t.replace(/\s/g,'')),'Rp0');
  await page.locator('.avatar img').filter({visible:true}).first().waitFor();assert.equal(await page.locator('.avatar img').filter({visible:true}).first().getAttribute('referrerpolicy'),'no-referrer');
  assert.deepEqual(errors,[]);console.log('PASS: account popover, profile, upgrade availability, mobile placement, account switching, avatar, auth setup fallback, mobile dialog, signup validation, confirmation message, recovery request, rejected login, login token, persistence, logout, Google retry error, PKCE handoff and verified callback/dashboard zoom (mock provider).');
}finally{await browser.close();}
