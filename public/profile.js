import {t} from './i18n.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const marker='uangflow-profile-return';
export const profileReturn=()=>sessionStorage.getItem(marker);

export async function openProfile(options){
  const {auth,user,show,updated,deleted,request}=options;
  show('<h2>Profil</h2><p role="status">Memuat profil…</p>');
  const {data,error}=await auth.getUser();
  if(error||!data.user||'supabase:'+data.user.id!==user.id){show('<h2>Profil</h2><p role="alert">Sesi profil berubah. Muat ulang lalu masuk kembali.</p>');return;}
  const account=data.user,identities=account.identities||[],google=identities.filter(identity=>identity.provider==='google');
  let returnValue;try{returnValue=JSON.parse(sessionStorage.getItem(marker)||'null');}catch{}sessionStorage.removeItem(marker);
  show(`<h2>Profil</h2><p>Kelola identitas dan cara masuk ke UangFlow.</p>
    <div class="profile-identity"><span class="avatar" aria-hidden="true">${escape(user.name.slice(0,1))}${user.avatarUrl?`<img src="${escape(user.avatarUrl)}" alt="" referrerpolicy="no-referrer">`:''}</span><div><strong data-user-content>${escape(user.name)}</strong><p data-user-content>${escape(account.email)}</p></div></div>
    <div class="profile-status" role="status" aria-live="polite">${returnValue?returnValue.owner===user.id?'Profil dimuat kembali. Periksa akun dan lanjutkan tindakanmu.':'Akun yang dipilih berbeda. Tidak ada perubahan atau penghapusan otomatis.':''}</div>
    <form id="profile-name-form" class="profile-section"><label>Username<input name="username" value="${escape(account.user_metadata?.username||user.name)}" minlength="1" maxlength="80" autocomplete="nickname" required></label><button class="secondary" type="submit">Simpan username</button></form>
    <form id="profile-email-form" class="profile-section"><label>Email akun<input name="email" type="email" value="${escape(account.email)}" maxlength="254" autocomplete="email" required></label><p class="muted">Email ini untuk akun UangFlow; alamat Gmail akun Google tidak berubah. Perubahan email perlu dikonfirmasi melalui tautan Supabase. Email lama tetap berlaku sampai verifikasi selesai.</p>${account.new_email?`<p class="notice">Menunggu konfirmasi: ${escape(account.new_email)}</p>`:''}<button class="secondary" type="submit">Ubah email</button></form>
    <form id="profile-photo-form" class="profile-section"><label>Foto profil<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required></label><p class="muted">PNG, JPG atau WebP, maksimal 3 MB. Foto disimpan secara privat.</p><div class="actions"><button class="secondary" type="submit">Simpan foto</button><button type="button" class="text-link" data-profile-action="remove-photo">Gunakan foto Google / inisial</button></div></form>
    <section class="profile-section"><h3>Akun Google yang dikaitkan</h3>${google.length?google.map(identity=>`<div class="linked-identity"><span>${escape(identity.identity_data?.email||'Akun Google')}<small>Google</small></span><button class="text-link" type="button" data-profile-action="unlink" data-identity="${escape(identity.identity_id)}" ${identities.length<2?'disabled':''}>Lepas</button></div>`).join(''):'<p>Belum ada akun Google yang dikaitkan.</p>'}<p class="muted">Tautkan akun baru sebelum melepas akun lama. Satu-satunya cara masuk tidak dapat dilepas. Pastikan login email atau akun lain sudah bisa digunakan.</p><button class="secondary" type="button" data-profile-action="link-google">${google.length?'Tautkan / ganti akun Google':'Tautkan akun Google'}</button></section>
    <section class="profile-section"><h3>Keamanan & salinan data</h3><div class="actions"><button class="text-link" type="button" data-profile-action="password">Kirim tautan atur password</button><button class="text-link" type="button" data-profile-action="backup">Unduh data saya</button></div><div class="profile-reauth"><p class="muted">Untuk tindakan sensitif, verifikasi ulang akunmu terlebih dahulu.</p><button class="secondary" type="button" data-profile-action="verify-google">Verifikasi dengan Google</button><form id="profile-verify-form"><label>Password email<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label><button class="secondary" type="submit">Verifikasi dengan password</button></form></div></section>
    <details class="profile-section profile-danger"><summary>Hapus akun UangFlow</summary><p>Akun UangFlow dan catatan di server ini akan dihapus permanen. Unduh salinan data terlebih dahulu. Tindakan ini tidak menghapus akun Google milikmu.</p><form id="profile-delete-form"><label>Ketik email akun<input name="email" type="email" required autocomplete="off"></label><label>Ketik HAPUS<input name="confirmation" pattern="HAPUS" required autocomplete="off"></label><button type="submit" class="danger">Hapus akun permanen</button></form></details>
    <p class="profile-error form-error" role="alert"></p>`);
  const modal=document.querySelector('#modal'),status=modal.querySelector('.profile-status'),failure=modal.querySelector('.profile-error');
  const run=async(task)=>{
    const controls=[...modal.querySelectorAll('button')],disabled=controls.filter(control=>control.disabled);
    controls.forEach(control=>control.disabled=true);failure.textContent='';status.textContent='';
    try{await task();}catch(error){failure.textContent=error.message||'Perubahan belum tersimpan. Coba lagi.';}
    finally{controls.forEach(control=>control.disabled=disabled.includes(control));}
  };
  const ensureOwner=async()=>{const result=await auth.getUser();if(result.error)throw result.error;if(result.data.user?.id!==account.id)throw Error('Akun berubah. Muat ulang sebelum mengubah profil.');return result.data.user;};
  const saveMetadata=async(metadata)=>{await ensureOwner();const result=await auth.updateUser({data:metadata});if(result.error)throw result.error;options.user=await updated();modal.querySelector('.profile-identity strong').textContent=options.user.name;};
  const returnToProfile=()=>sessionStorage.setItem(marker,JSON.stringify({owner:user.id}));
  modal.querySelector('#profile-name-form').onsubmit=event=>{event.preventDefault();void run(async()=>{const username=new FormData(event.target).get('username').trim();if(!username||username.length>80)throw Error('Username harus berisi 1–80 karakter.');await saveMetadata({username});status.textContent='Username berhasil disimpan.';});};
  modal.querySelector('#profile-email-form').onsubmit=event=>{event.preventDefault();void run(async()=>{await ensureOwner();const email=new FormData(event.target).get('email').trim();if(email.toLowerCase()===account.email.toLowerCase())throw Error('Masukkan email baru.');const result=await auth.updateUser({email},{emailRedirectTo:location.origin+'/'});if(result.error)throw result.error;returnToProfile();status.textContent='Permintaan perubahan email dikirim. Konfirmasi tautan pada email lama dan baru sesuai petunjuk Supabase.';});};
  modal.querySelector('#profile-photo-form').onsubmit=event=>{event.preventDefault();void run(async()=>{
    await ensureOwner();const file=new FormData(event.target).get('photo');
    if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024)throw Error('Gunakan PNG, JPG atau WebP maksimal 3 MB.');
    const image=await createImageBitmap(file);
    try{
      if(image.width*image.height>16000000)throw Error('Resolusi foto terlalu besar. Gunakan gambar di bawah 16 megapiksel.');
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d');
      const side=Math.min(image.width,image.height);context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!blob||blob.type!=='image/webp'||blob.size>262144)throw Error('Foto belum dapat diproses. Coba gambar lain.');
      const path=account.id+'/profile.webp',upload=await window.uangflowAuth.storage.from('avatars').upload(path,blob,{contentType:'image/webp',cacheControl:'0',upsert:true});
      if(upload.error)throw upload.error;await saveMetadata({profile_avatar_path:path});status.textContent='Foto profil berhasil disimpan.';
      const photo=modal.querySelector('.profile-identity .avatar');photo.querySelector('img')?.remove();const img=document.createElement('img');img.alt='';img.src=URL.createObjectURL(blob);img.onload=()=>URL.revokeObjectURL(img.src);photo.append(img);
    }finally{image.close();}
  });};
  modal.querySelector('#profile-verify-form').onsubmit=event=>{event.preventDefault();void run(async()=>{const password=new FormData(event.target).get('password');const result=await auth.signInWithPassword({email:account.email,password});event.target.reset();if(result.error)throw result.error;if(result.data.user?.id!==account.id)throw Error('Akun verifikasi berbeda. Tidak ada penghapusan.');status.textContent='Verifikasi selesai. Kamu bisa melanjutkan tindakan sensitif dalam 5 menit.';});};
  modal.querySelector('#profile-delete-form').onsubmit=event=>{event.preventDefault();void run(async()=>{
    const input=Object.fromEntries(new FormData(event.target));if(input.confirmation!=='HAPUS'||input.email.trim().toLowerCase()!==account.email.toLowerCase())throw Error('Ketik HAPUS dan email akun yang sesuai.');
    const removed=await window.uangflowAuth.storage.from('avatars').remove([account.id+'/profile.webp']);if(removed.error)throw removed.error;
    const response=await request('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),result=await response.json();
    if(!response.ok)throw Error(result.error||'Akun belum dihapus.');if(!result.ok)throw Error('Penghapusan belum terkonfirmasi.');
    sessionStorage.removeItem(marker);await deleted();
  });};
  modal.querySelectorAll('[data-profile-action]').forEach(button=>button.onclick=()=>void run(async()=>{
    const action=button.dataset.profileAction;
    if(action==='backup'){options.backup();status.textContent='Salinan data diunduh.';return;}
    if(action==='password'){const result=await auth.resetPasswordForEmail(account.email,{redirectTo:location.origin+'/?auth=recovery'});if(result.error)throw result.error;status.textContent='Tautan pengaturan password dikirim ke email akunmu.';return;}
    await ensureOwner();
    if(action==='link-google'||action==='verify-google'){
      returnToProfile();const settings={provider:'google',options:{redirectTo:location.origin+'/#dashboard',queryParams:{prompt:'select_account'}}};
      const result=await (action==='link-google'?auth.linkIdentity(settings):auth.signInWithOAuth(settings));if(result.error){sessionStorage.removeItem(marker);throw result.error;}return;
    }
    if(action==='remove-photo'){
      const result=await window.uangflowAuth.storage.from('avatars').remove([account.id+'/profile.webp']);if(result.error)throw result.error;await saveMetadata({profile_avatar_path:null});await openProfile(options);return;
    }
    if(action==='unlink'){
      const current=await ensureOwner(),identity=current.identities?.find(identity=>identity.identity_id===button.dataset.identity);
      if(!identity||(current.identities?.length||0)<2)throw Error('Tautkan cara masuk lain sebelum melepas Google.');
      if(!window.confirm(t('Lepas akun Google '+(identity.identity_data?.email||'ini')+'? Pastikan kamu bisa masuk dengan cara lain.')))return;
      const result=await auth.unlinkIdentity(identity);if(result.error)throw result.error;options.user=await updated();await openProfile(options);
    }
  }));
}
