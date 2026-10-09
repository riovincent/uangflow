import {CATEGORIES,TYPES,STATUSES,HEADERS,today,money,amount,validDate,days,blank,transaction,validateLinks,duplicate,summary,parseCSV,csvExport,load,demo} from './domain.js';

const root=document.querySelector('#app'), modal=document.querySelector('#modal');
const auth=window.uangflowAuth?.auth;
async function apiFetch(path,options={}) {
  const headers=new Headers(options.headers);
  if(auth){
    const {data,error}=await auth.getSession();if(error)throw error;
    if(options.method&&((data.session&&user?.id!=='supabase:'+data.session.user.id)||(!data.session&&user?.provider==='supabase')))throw Error('Akun berubah. Unduh salinan perubahan sebelum memuat ulang.');
    if(data.session)headers.set('Authorization','Bearer '+data.session.access_token);
  }
  return fetch(path,{...options,headers});
}
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
const icons={home:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',wallet:'M3 6h18v15H3Z M3 6V3h15v3 M16 12h5v5h-5Z',chart:'M4 20V10h4v10 M10 20V4h4v16 M16 20v-7h4v7',goal:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 12h.01',spark:'m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',upload:'M12 16V3 m-5 5 5-5 5 5 M4 15v6h16v-6',plus:'M12 5v14 M5 12h14',arrow:'M7 17 17 7 M7 7h10v10',check:'m5 12 4 4 10-10',leaf:'M20 3C5 3 2 8 5 15s15 4 15-12 M4 20 15 9',logout:'M10 3H3v18h7 M8 12h13 m-4-4 4 4-4 4'};
const icon=(name)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(icons[name]||icons.wallet).split(' M').map((p,i)=>`<path d="${i?'M':''}${p}"/>`).join('')}</svg>`;
const pages={dashboard:['Ringkasan','home'],transactions:['Transaksi','wallet'],budget:['Anggaran','chart'],goals:['Tabungan','goal'],coach:['Money coach','spark'],imports:['Impor CSV','upload'],settings:['Pengaturan','settings']};
let state=blank(),personal=null,user=null,revision=0,isDemo=false,page='dashboard',saving=false,syncError='',pendingChanges=null,importRows=[],coachAnswer='',filters={search:'',category:'',type:'',status:'',from:'',to:''};
const dateLabel=d=>validDate(d)?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(d+'T00:00:00+07:00')):'Belum diatur';
const options=(values,current,empty)=>`${empty?`<option value="">${escape(empty)}</option>`:''}${Object.entries(Array.isArray(values)?Object.fromEntries(values.map(v=>[v,v])):values).map(([v,l])=>`<option value="${escape(v)}" ${v===current?'selected':''}>${escape(l)}</option>`).join('')}`;
const input=(name,label,value='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const select=(name,label,values,value='',empty)=>`<label>${label}<select name="${name}">${options(values,value,empty)}</select></label>`;
const empty=(title,text,action='')=>`<div class="empty">${icon('leaf')}<h3>${title}</h3><p>${text}</p>${action}</div>`;
const button=(action,label,kind='primary',extra='')=>`<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
function toast(message){const e=document.querySelector('#toast');e.textContent=message;e.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('visible'),5000);}
async function commit(next) {
  if(saving)throw Error('Tunggu hingga penyimpanan selesai.');
  next=load({getItem:()=>JSON.stringify(next)});
  if(isDemo){state=next;render();return;}
  if(!user)throw Error('Masuk terlebih dahulu untuk menyimpan data.');
  saving=true;syncError='';document.querySelector('#sync')?.replaceChildren(document.createTextNode('Menyimpan…'));
  try {
    const response=await apiFetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:next,revision})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Gagal menyimpan.');
    revision=result.revision;state=next;personal=next;pendingChanges=null;toast('Tersimpan di akun Anda.');
  }catch(error){pendingChanges=next;syncError=error.message;throw error;}finally{saving=false;document.querySelector('#sync')?.replaceChildren(document.createTextNode(syncError?'Belum tersimpan':'Tersimpan di akun'));}
}
function welcome(){
  return `<main id="main" class="welcome"><header class="welcome-header"><a href="/" class="brand">${icon('leaf')} UangFlow</a><span class="badge">RUANG KEUANGAN MAHASISWA</span></header>
    <div class="welcome-grid"><section class="welcome-story"><span class="eyebrow"><i class="status-dot"></i> LANGKAH KECIL. RENCANA BESAR.</span><h1>Uang sakumu.<br><em>Rencana besarmu.</em></h1><p class="lead">Lebih paham ke mana uangmu pergi. Lebih tenang merencanakan yang berarti.</p>
    <div class="actions">${user?button('onboard','Atur uang sakumu '+icon('arrow')):button('signin','Masuk '+icon('arrow'))+button('signup','Buat akun','secondary')}${button('demo','Coba demo','text-link')}${user?button('signout','Keluar','text-link'):''}${pendingChanges?button('backup','Unduh perubahan belum tersimpan','secondary'):''}</div>
    <p class="welcome-caption">${icon('check')}${user?'Akunmu siap. Mulai dengan rencana sederhana.':'Coba dulu dengan data contoh, tanpa membuat akun.'}</p><div class="feature-list"><span>${icon('check')} Catat transaksi harian</span><span>${icon('check')} Susun anggaranmu</span><span>${icon('check')} Simpan per akun</span></div></section>
    <section class="welcome-preview" aria-label="Contoh ringkasan dengan data fiktif"><div class="preview-heading"><span class="preview-logo">${icon('leaf')} Ringkasanmu</span><span class="badge">DATA CONTOH</span></div><p>Ruang belanja hari ini</p><div class="preview-money">Rp57.850<span>/ hari</span></div><span class="preview-caption">Dari rencana dan catatan pengeluaranmu</span><div class="mini-chart" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="chart-days" aria-hidden="true"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div><div class="preview-bottom">${icon('goal')} Sedikit demi sedikit, jadi bukit.</div><div class="preview-note">${icon('check')} Satu catatan, satu langkah lebih terarah.</div></section></div>
    <section class="welcome-features" aria-label="Yang bisa kamu lakukan"><article><span class="feature-icon">${icon('wallet')}</span><div><h2>Catatan yang rapi.</h2><p>Tambah pengeluaran atau impor CSV. Semua ada di satu tempat.</p></div></article><article><span class="feature-icon">${icon('chart')}</span><div><h2>Rencana yang masuk akal.</h2><p>Lihat dana tercatat, tagihan, dan ruang belanja harianmu.</p></div></article><article><span class="feature-icon">${icon('goal')}</span><div><h2>Impian yang lebih dekat.</h2><p>Buat target tabungan dan pantau kemajuannya sedikit demi sedikit.</p></div></article></section><p class="notice">QRIS otomatis belum tersedia. Catat transaksi atau impor CSV; ringkasan bukan saldo bank terverifikasi.</p><footer class="welcome-footer"><span>UangFlow · Mulai kecil, tetap maju.</span><span>Dibuat untuk rencana sehari-hari.</span></footer></main>`;
}
function render(){
  if(!state.onboarded && page!=='settings'){root.innerHTML=welcome();return;}
  const active=pages[page]||pages.dashboard;
  root.innerHTML=`<aside class="sidebar"><a href="#dashboard" class="brand">${icon('leaf')} UangFlow</a><span class="nav-label">RUANG KEUANGANMU</span><nav aria-label="Navigasi utama">${Object.entries(pages).map(([key,[label,glyph]])=>`<button data-page="${key}" class="nav-item ${page===key?'active':''}" ${page===key?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></button>`).join('')}<details class="mobile-more"><summary class="${['coach','imports','settings'].includes(page)?'active':''}">${icon('settings')}<span>Lainnya</span></summary><div class="mobile-menu">${['coach','imports','settings'].map(key=>button('',icon(pages[key][1])+pages[key][0],'nav-item',`data-page="${key}" ${page===key?'aria-current="page"':''}`)).join('')}</div></details></nav><div class="sidebar-note">${icon('leaf')}<strong>Pelan-pelan, tetap maju.</strong><p>Setiap catatan adalah langkah kecil untuk rencana besarmu.</p></div><div class="account"><span class="avatar">${isDemo?'D':escape((user?.name||'U').slice(0,1).toUpperCase())}</span><div><strong>${isDemo?'Mode demo':'Akun pribadi'}</strong><small id="sync">${isDemo?'Data fiktif • tidak disimpan':syncError?'Belum tersimpan':'Tersimpan di akun'}</small></div></div></aside><div class="workspace"><header class="topbar"><span>Keuangan pribadi <span class="divider">/</span> <strong>${active[0]}</strong></span><div>${isDemo?button('exit-demo','Keluar demo','secondary small'):button('signout','Keluar '+icon('logout'),'text-link')}<span class="date-pill">${dateLabel(today())}</span></div></header>${isDemo?'<div class="demo-banner">Anda menggunakan data fiktif. Perubahan demo tidak menyentuh akun pribadi.</div>':''}<main id="main" tabindex="-1">${({dashboard:dashboard,transactions:transactions,budget:budget,goals:goals,coach:coach,imports:imports,settings:settings}[page]||dashboard)()}</main><footer>UangFlow · Dibuat untuk langkah kecilmu <span>Estimasi berdasarkan catatan, bukan saldo bank.</span></footer></div>`;
}
function heading(kicker,title,subtitle,action=''){return `<div class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;}
function txTable(list,compact=false){
  if(!list.length)return empty('Belum ada transaksi','Mulai catat pengeluaran pertamamu atau impor file CSV.',button('add-tx','Tambah transaksi','secondary'));
  return `<div class="table-wrap"><table><thead><tr><th>Transaksi</th><th>Tanggal</th>${compact?'':'<th>Status</th>'}<th class="numeric">Nominal</th><th><span class="sr-only">Tindakan</span></th></tr></thead><tbody>${list.map(t=>`<tr><td><div class="tx-description"><span class="tx-icon ${t.type==='income'||t.type==='refund'?'mint':''}">${icon(t.type==='transfer'?'arrow':'wallet')}</span><div><strong>${escape(t.description)}</strong><small>${escape(t.category)} · ${TYPES[t.type]} · ${escape(t.source)}${t.goalId?' · Alokasi tabungan':''}${t.refundOf?' · Terhubung':''}</small></div></div></td><td>${dateLabel(t.date)}</td>${compact?'':`<td><span class="badge ${t.status==='completed'?'mint':'neutral'}">${STATUSES[t.status]}</span></td>`}<td class="numeric ${t.type==='income'||t.type==='refund'?'positive':''}">${t.type==='expense'?'−':t.type==='income'||t.type==='refund'?'+':''}${money(t.amount)}</td><td><button class="icon-button" data-action="edit-tx" data-id="${escape(t.id)}" aria-label="Ubah ${escape(t.description)}">${icon('settings')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function dashboard(){
  const s=summary(state), month=today().slice(0,7),spending=s.monthly(month);
  const highest=Object.entries(s.categories).sort((a,b)=>b[1]-a[1])[0];
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return `${heading('CERITA UANGMU','Lebih tenang, lebih terencana.','Lihat posisi keuanganmu dari catatan yang kamu buat.',button('add-tx',icon('plus')+' Catat transaksi'))}<div class="dashboard-grid"><section class="hero-card"><div class="hero-top"><span>${icon('wallet')} Dana tersedia tercatat</span><span class="badge">ESTIMASI</span></div><div class="hero-amount">${money(s.available)}</div><p>Dihitung sejak ${dateLabel(state.settings.openingDate)}. Tabungan yang dialokasikan sudah dipisahkan.</p><div class="hero-bottom"><div><small>Ruang belanja fleksibel</small><strong>${money(Math.max(0,s.flexible))}</strong></div><div><small>Per hari hingga uang saku berikutnya</small><strong>${s.daily===null?'Atur tanggal':money(s.daily)}</strong></div></div>${s.flexible<0?`<p class="hero-warning">Rencana kekurangan ${money(-s.flexible)}. Tinjau tagihan atau alokasi tabungan.</p>`:''}</section><section class="stat-card"><span class="stat-icon">${icon('chart')}</span><span class="muted">Pengeluaran bersih bulan ini</span><h2>${money(spending)}</h2><p>Pengeluaran selesai dikurangi pengembalian yang tercatat.</p><button class="text-link" data-page="transactions">Lihat catatan ${icon('arrow')}</button></section></div><div class="metrics-row"><section class="mini-stat"><span class="stat-icon amber">${icon('wallet')}</span><div><small>Tagihan belum terbayar</small><strong>${money(s.remainingBills)}</strong></div></section><section class="mini-stat"><span class="stat-icon">${icon('goal')}</span><div><small>Tabungan masih dicadangkan</small><strong>${money(s.remainingSavings)}</strong></div></section><section class="mini-stat"><span class="stat-icon blue">${icon('upload')}</span><div><small>Impor CSV terakhir</small><strong>${state.lastImport?dateLabel(state.lastImport):'Belum ada impor'}</strong></div></section></div><div class="two-column"><section class="panel"><div class="panel-heading"><h2>Ke mana uangmu pergi?</h2><span class="muted">Bulan ini</span></div>${Object.values(s.categories).some(v=>v>0)?`<div class="category-bars">${Object.entries(s.categories).filter(([,v])=>v>0).map(([c,v],i)=>`<div><div class="bar-label"><span><i class="dot color-${i%4}"></i>${c}</span><strong>${money(v)}</strong></div><progress max="${Math.max(1,...Object.values(s.categories))}" value="${v}" aria-label="Pengeluaran ${c}"></progress></div>`).join('')}</div>`:empty('Masih bersih','Grafik muncul setelah transaksi selesai dicatat.')}</section><section class="panel insight-panel"><span class="stat-icon">${icon('spark')}</span><span class="eyebrow">RINGKASAN OTOMATIS</span><h2>Ruang untuk keputusan yang lebih baik.</h2><p>${highest?.[1]>0?`${highest[0]} adalah kategori terbesar bulan ini: ${money(highest[1])}. Tinjau apakah sesuai dengan prioritasmu.`:'Catat beberapa transaksi untuk melihat pola pengeluaranmu.'}</p><button class="secondary" data-page="coach">Buka money coach ${icon('arrow')}</button><small>Ringkasan mengikuti kelengkapan catatanmu.</small></section></div><section class="panel"><div class="panel-heading"><h2>Transaksi terbaru</h2><button class="text-link" data-page="transactions">Lihat semua ${icon('arrow')}</button></div>${txTable(recent,true)}</section><p class="notice">Pengeluaran yang belum dicatat dapat mengubah estimasi. QRIS otomatis: <strong>Belum tersedia.</strong></p>`;
}
function transactions(){
  const list=state.transactions.filter(t=>(!filters.search||t.description.toLowerCase().includes(filters.search.toLowerCase())||t.reference.toLowerCase().includes(filters.search.toLowerCase()))&&(!filters.category||t.category===filters.category)&&(!filters.type||t.type===filters.type)&&(!filters.status||t.status===filters.status)&&(!filters.from||t.date>=filters.from)&&(!filters.to||t.date<=filters.to)).sort((a,b)=>b.date.localeCompare(a.date));
  return `${heading('CATATAN HARIAN','Setiap rupiah punya cerita.','Transfer antar rekening bukan pengeluaran. Catat pengembalian secara terpisah.',button('add-tx',icon('plus')+' Tambah transaksi'))}<form id="filters" class="panel filter-grid">${input('search','Cari transaksi',filters.search,'search','placeholder="Deskripsi atau referensi"')}${select('category','Kategori',CATEGORIES,filters.category,'Semua kategori')}${select('type','Jenis',TYPES,filters.type,'Semua jenis')}${select('status','Status',STATUSES,filters.status,'Semua status')}${input('from','Dari',filters.from,'date')}${input('to','Sampai',filters.to,'date')}<button class="secondary" type="submit">Terapkan</button>${button('reset-filters','Reset','text-link')}</form><section class="panel"><div class="panel-heading"><h2>${list.length} transaksi</h2>${button('export','Ekspor CSV','secondary small')}</div>${txTable(list)}</section>`;
}
function budget(){
  const s=summary(state);
  return `${heading('RENCANA BULANAN','Beri uangmu arah.','Anggaran kategori berlaku per bulan; tagihan dan tabungan dicadangkan sejak tanggal dana awal.')}<section class="panel"><div class="panel-heading"><h2>Anggaran kategori</h2><span class="badge">${money(Object.values(state.budgets).reduce((a,b)=>a+b,0))} dialokasikan</span></div><form id="budget-form"><div class="budget-grid">${CATEGORIES.map(c=>`<label>${c}<input type="number" min="0" max="1000000000" step="1" name="${c}" value="${state.budgets[c]}" required><span class="${state.budgets[c]-s.categories[c]<0?'negative':'muted'}">${state.budgets[c]-s.categories[c]<0?'Melebihi '+money(s.categories[c]-state.budgets[c]):'Sisa '+money(state.budgets[c]-s.categories[c])} · Terpakai ${money(s.categories[c])}</span></label>`).join('')}</div><div class="form-actions"><button class="primary" type="submit">Simpan anggaran</button></div></form></section><div class="two-column"><section class="panel"><div class="panel-heading"><h2>Tagihan penting</h2>${button('add-bill',icon('plus')+' Tambah','secondary small')}</div>${state.bills.length?state.bills.map(b=>`<div class="list-item"><div><strong>${escape(b.name)}</strong><small>Jatuh tempo ${dateLabel(b.due)} · ${money(b.amount)}</small><span class="${s.billRemaining(b)?'muted':'positive'}">${s.billRemaining(b)?'Sisa '+money(s.billRemaining(b)):'Terbayar'}</span></div><div class="actions">${s.billRemaining(b)?button('pay-bill','Catat bayar','secondary small',`data-id="${escape(b.id)}"`):''}<button class="icon-button" data-action="edit-bill" data-id="${escape(b.id)}" aria-label="Ubah tagihan ${escape(b.name)}">${icon('settings')}</button></div></div>`).join(''):empty('Belum ada tagihan','Tambahkan tagihan untuk mencadangkan dana.')}</section><section class="panel"><span class="eyebrow">ANGGARAN HARIAN</span><h2>${s.daily===null?'Tanggal belum lengkap':money(s.daily)+' / hari'}</h2><p>Dana tercatat ${money(s.available)} − tagihan ${money(s.remainingBills)} − tabungan ${money(s.remainingSavings)}.</p><p>${s.until>0?'Dibagi '+s.until+' hari hingga '+dateLabel(state.settings.nextDate)+'.':'Atur tanggal uang saku berikutnya yang berada di masa depan.'}</p>${s.flexible<0?`<p class="negative">Kekurangan ${money(-s.flexible)}. Tidak ada dana fleksibel dari rencana saat ini.</p>`:''}<button class="text-link" data-page="settings">Ubah dana awal & tanggal ${icon('arrow')}</button><p class="muted">Estimasi ini bukan saldo bank. Uang saku mendatang belum dihitung sebagai pemasukan.</p></section></div>`;
}
function goals(){
  const s=summary(state);
  return `${heading('LANGKAH KECILMU','Impian punya rencana.','Catatan tabungan adalah alokasi, bukan pemindahan uang.',button('add-goal',icon('plus')+' Buat target'))}<div class="goal-grid">${state.goals.length?state.goals.map(g=>{const saved=s.goalSaved(g),needed=Math.max(0,g.target-saved),d=days(today(),g.date),perMonth=d>0?Math.ceil(needed/Math.max(1,Math.ceil(d/30))):needed;return `<section class="panel goal-card"><div class="panel-heading"><span class="stat-icon">${icon('goal')}</span><button class="icon-button" data-action="edit-goal" data-id="${escape(g.id)}" aria-label="Ubah ${escape(g.name)}">${icon('settings')}</button></div><h2>${escape(g.name)}</h2><p>Target ${dateLabel(g.date)}</p><h3>${money(saved)} <small>dari ${money(g.target)}</small></h3><progress max="${g.target}" value="${Math.min(g.target,saved)}" aria-label="Kemajuan ${escape(g.name)}"></progress><p>${needed===0?'Target tercapai!':d<=0?'Tanggal target telah tiba. Sisa '+money(needed)+'.':'Perlu sekitar '+money(perMonth)+' / 30 hari.'}</p><p>Dicadangkan untuk periode ini: ${money(s.goalReserve(g))}</p>${perMonth>Math.max(0,s.available-s.remainingBills)?'<p class="negative">Kontribusi yang diperlukan melebihi dana tercatat setelah tagihan. Pertimbangkan tanggal yang lebih panjang.</p>':''}${button('save-goal','Catat alokasi tabungan','secondary',`data-id="${escape(g.id)}"`)}</section>`;}).join(''):empty('Mulai dari satu impian','Laptop, dana darurat, atau perjalanan—buat target pertamamu.',button('add-goal','Buat target','secondary'))}</div><p class="notice">Tabungan awal dianggap sudah berada di luar dana awal yang dapat dibelanjakan. Alokasi baru mengurangi dana tersedia, tetapi tidak dihitung sebagai pengeluaran.</p>`;
}
const questions=['Ke mana uang saya paling banyak digunakan?','Berapa anggaran harian saya?','Bagaimana mencapai target tabungan saya?','Apa yang berubah dari pengeluaran bulan lalu?'];
function coach(){return `${heading('PENDAMPING ANGGARAN','Pahami angka, pilih langkahmu.','Ringkasan otomatis menggunakan perhitungan dari catatanmu.')}<section class="panel coach-panel"><div class="coach-avatar">${icon('spark')}</div><span class="badge mint">Ringkasan otomatis · tanpa layanan AI</span><h2>Apa yang ingin kamu pahami?</h2><p>Pengeluaran, anggaran, atau tabungan—mulai dengan pertanyaan sederhana.</p><div class="question-grid">${questions.map(q=>button('ask',escape(q),'question',`data-question="${escape(q)}"`)).join('')}</div><form id="coach-form" class="coach-input"><label class="sr-only" for="question">Pertanyaan anggaran</label><input id="question" name="question" placeholder="Tanyakan tentang anggaran atau tabungan…" maxlength="300" required><button class="primary" type="submit">Tanya ${icon('arrow')}</button></form>${coachAnswer?`<div class="coach-answer" role="status">${escape(coachAnswer).replaceAll('\n','<br>')}</div>`:''}<p class="muted">Tidak terhubung ke AI. Tidak memberi rekomendasi investasi atau memindahkan uang. Tidak ada data yang dikirim ke penyedia AI.</p></section>`;}
function answer(question){
  const s=summary(state),q=question.toLowerCase();let result;
  if(q.includes('bulan lalu')){const date=new Date(today()+'T00:00:00Z');date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-1);const last=date.toISOString().slice(0,7),current=s.monthly(today().slice(0,7)),prior=s.monthly(last);result=`Observasi: pengeluaran bersih bulan ini ${money(current)}; bulan lalu ${money(prior)}. Selisih ${money(current-prior)}.\nEstimasi: bulan ini mungkin belum selesai dan nol tidak berarti tidak ada pengeluaran jika catatan belum lengkap.`;}
  else if(q.includes('harian')||q.includes('anggaran'))result=s.daily===null?'Informasi belum lengkap: atur tanggal uang saku berikutnya di masa depan pada Pengaturan.':`Estimasi: anggaran fleksibel harian ${money(s.daily)} untuk ${s.until} hari. Dana tersedia ${money(s.available)}, tagihan ${money(s.remainingBills)}, dan cadangan tabungan ${money(s.remainingSavings)}.${s.flexible<0?' Rencana kekurangan '+money(-s.flexible)+'.':''}\nSaran: tinjau kebutuhan penting sebelum mengubah alokasi.`;
  else if(q.includes('tabung')||q.includes('target'))result=state.goals.length?state.goals.map(g=>`Estimasi untuk ${g.name}: sisa ${money(Math.max(0,g.target-s.goalSaved(g)))} hingga ${dateLabel(g.date)}. Cadangan periode ini ${money(s.goalReserve(g))}.`).join('\n')+'\nSaran: buka Tabungan untuk melihat kontribusi yang diperlukan dan meninjau tanggal target.':'Informasi belum lengkap: buat target dan tanggal di halaman Tabungan terlebih dahulu.';
  else if(q.includes('pengeluaran')||q.includes('uang')||q.includes('kategori')){const top=Object.entries(s.categories).sort((a,b)=>b[1]-a[1])[0];result=top[1]>0?`Observasi: ${top[0]} adalah kategori dengan pengeluaran bersih terbesar bulan ini, ${money(top[1])}.\nSaran: bandingkan dengan anggaran kategori dan periksa transaksi yang belum dikategorikan dengan tepat.`:'Belum cukup catatan: tambahkan pengeluaran selesai untuk melihat pola.';}
  else result='Ringkasan ini mendukung pertanyaan tentang pengeluaran, anggaran harian, tabungan, dan perbandingan bulan. Pilih salah satu pertanyaan di atas.';
  coachAnswer=result+'\n\nAngka mengikuti catatan yang tersedia, bukan saldo bank terverifikasi.';render();
}
function settings(){
  const p=state.settings;
  return `${heading('PREFERENSI & PRIVASI',state.onboarded?'Rencanamu bisa berubah.':'Mulai dengan angka yang kamu tahu.','Dana awal dan tanggalnya menjadi dasar estimasi. Jangan masukkan tabungan yang sudah terpisah.')}<section class="panel"><form id="settings-form"><h2>Uang saku & dana awal</h2><div class="form-grid">${select('cycle','Siklus uang saku',{monthly:'Bulanan',weekly:'Mingguan',custom:'Lainnya'},p.cycle)}${input('nextDate','Tanggal uang saku berikutnya (opsional)',p.nextDate,'date')}${input('opening','Dana tersedia pada tanggal awal (Rp)',p.opening,'number','min="0" max="1000000000" step="1" required')}${input('openingDate','Tanggal dana awal',p.openingDate,'date',`required max="${today()}"`)}</div><p class="muted">Transaksi sebelum tanggal dana awal tidak mengubah dana tersedia. Catat pengeluaran setelah tanggal ini; jangan memasukkan dana yang sama lagi sebagai pemasukan.</p><div class="form-actions"><button class="primary" type="submit">${state.onboarded?'Simpan pengaturan':'Mulai mencatat'}</button></div><p class="form-error" role="alert"></p></form></section><section class="panel"><h2>Data & koneksi</h2><div class="list-item"><div><strong>Penyimpanan akun</strong><p>${isDemo?'Demo hanya di memori browser dan hilang saat halaman dimuat ulang.':'Data keuangan disimpan di database server, terpisah berdasarkan akun Anda. Masuk dengan akun yang sama untuk mengaksesnya di perangkat lain.'}</p></div></div><div class="list-item"><div><strong>Penangkapan notifikasi QRIS</strong><p>Memerlukan aplikasi Android terpisah atau integrasi resmi penyedia pembayaran.</p></div><span class="badge neutral">Belum tersedia</span></div><div class="list-item"><div><strong>Money coach</strong><p>Ringkasan berdasarkan rumus. Tidak ada data dikirim ke penyedia AI.</p></div><span class="badge mint">Ringkasan otomatis</span></div><p class="muted">Kami tidak meminta PIN, OTP, atau kata sandi bank. Ekspor rutin untuk menyimpan salinan catatan Anda.</p><div class="actions">${button('export','Ekspor transaksi CSV','secondary')}${button('backup','Unduh salinan lengkap','secondary')}${button('delete-all','Hapus semua data keuangan','danger')}</div></section>`;
}
function inspectImports(){let seen=[...state.transactions];return importRows.map(row=>{let error=row.shapeError,tx=null,possible=false;try{tx=transaction({...row.raw,source:'csv'});possible=duplicate(tx,seen);if(row.included)seen.push(tx);}catch(e){error ||=e.message;}return {...row,error,tx,possible};});}
function imports(){
  const checked=inspectImports();
  return `${heading('IMPOR & PERIKSA','Catatan lama, awal yang rapi.','Gunakan format contoh CSV. Format setiap bank dapat berbeda.',button('sample','Unduh contoh CSV','secondary'))}<section class="panel"><div class="upload-box">${icon('upload')}<h2>Pilih file transaksi CSV</h2><p>Maksimal 1 MB dan 1.000 baris. Nominal rupiah bulat tanpa pemisah ribuan.</p><label class="file-label">Pilih file<input id="csv-file" type="file" accept=".csv,text/csv"></label></div><p class="muted">Jenis: expense, income, transfer, refund. Status: completed, pending, failed. Tanggal: YYYY-MM-DD. Pengembalian dapat dihubungkan ke transaksi asli setelah impor.</p>${checked.length?`<div class="panel-heading"><h2>Tinjau ${checked.length} baris</h2><span class="badge">${checked.filter(r=>r.error).length} perlu koreksi</span></div><p class="notice">Baris yang ditandai kemungkinan duplikat tidak dihapus otomatis. Koreksi kolom lalu keluar dari kolom untuk memvalidasi ulang, atau hilangkan centang sebelum impor.</p><div class="table-wrap"><table class="import-table"><thead><tr><th>Impor</th>${HEADERS.map(h=>`<th>${h}</th>`).join('')}<th>Pemeriksaan</th></tr></thead><tbody>${checked.map((r,i)=>`<tr><td><input type="checkbox" data-import-index="${i}" data-include ${r.included?'checked':''} aria-label="Sertakan baris ${i+1}"></td>${HEADERS.map(h=>`<td><input data-import-index="${i}" data-column="${h}" aria-label="Baris ${i+1} ${h}" value="${escape(r.raw[h])}" maxlength="200"></td>`).join('')}<td class="import-note ${r.error?'negative':r.possible?'warning':'positive'}">${escape(r.error|| (r.possible?'Kemungkinan duplikat':'Valid'))}</td></tr>`).join('')}</tbody></table></div><div class="form-actions">${button('import-confirm','Simpan baris terpilih')}${button('import-cancel','Batalkan','secondary')}</div>`:''}</section>`;
}
function openDialog(html){modal.innerHTML=`<div class="dialog-heading"><span class="eyebrow">UANGFLOW</span><button class="icon-button" data-action="close-modal" aria-label="Tutup">×</button></div>${html}`;const title=modal.querySelector('h2');if(title){title.id='dialog-title';modal.setAttribute('aria-labelledby',title.id);}if(!modal.open)modal.showModal();}
function authDialog(mode='signin') {
  const titles={signin:'Masuk ke UangFlow',signup:'Buat akun UangFlow',reset:'Lupa password?',resend:'Kirim ulang konfirmasi email',update:'Buat password baru'};
  openDialog(`<h2>${titles[mode]}</h2><p>${mode==='signup'?'Mulai catat uangmu dengan akun pribadi.':mode==='reset'?'Kami akan mengirim tautan pemulihan ke emailmu.':mode==='update'?'Simpan password baru untuk akunmu.':'Selamat datang kembali.'}</p>
    ${!auth?'<p class="notice">Login email dan Google sedang disiapkan. Untuk sementara, gunakan ChatGPT atau coba demo.</p>':`<form id="auth-form" data-mode="${mode}">
      ${mode==='signup'?input('name','Nama', '', 'text','autocomplete="name" maxlength="80" required'):''}
      ${mode!=='update'?input('email','Email','','email','autocomplete="email" maxlength="254" required'):''}
      ${mode!=='reset'&&mode!=='resend'?input('password',mode==='update'?'Password baru':'Password','','password',`autocomplete="${mode==='signin'?'current-password':'new-password'}" minlength="${mode==='signin'?1:12}" maxlength="128" required`):''}
      ${mode==='signup'||mode==='update'?input('confirm','Ulangi password','','password','autocomplete="new-password" minlength="12" maxlength="128" required'):''}
      ${mode==='signup'||mode==='update'?'<p class="muted">Gunakan minimal 12 karakter dan password yang berbeda dari akun lain.</p>':''}
      <p class="form-error" role="alert"></p><p class="auth-message" role="status"></p>
      <button class="primary auth-wide" type="submit">${({signin:'Masuk',signup:'Daftar akun',reset:'Kirim tautan pemulihan',resend:'Kirim email konfirmasi',update:'Simpan password'})[mode]}</button>
    </form>`}
    ${mode==='signin'||mode==='signup'?`<div class="auth-providers">${auth&&window.uangflowGoogle?button('google-signin','Lanjutkan dengan Google','secondary auth-wide'):''}<a class="secondary auth-wide" href="/signin-with-chatgpt?return_to=%2F" target="_top">Lanjutkan dengan ChatGPT</a></div><div class="auth-links">${mode==='signin'?button('signup','Belum punya akun? Daftar','text-link')+ (auth?button('reset-password','Lupa password?','text-link')+button('resend-confirmation','Kirim ulang konfirmasi email','text-link'):''):button('signin','Sudah punya akun? Masuk','text-link')}</div>`:mode==='reset'||mode==='resend'?button('signin','Kembali ke halaman masuk','text-link'):''}`);
}
async function submitAuth(form) {
  if(!auth)throw Error('Login email belum diaktifkan.');
  const data=Object.fromEntries(new FormData(form)),mode=form.dataset.mode,submit=form.querySelector('[type=submit]'),error=form.querySelector('.form-error'),message=form.querySelector('.auth-message');
  const submitLabel=submit.textContent;submit.disabled=true;submit.setAttribute('aria-busy','true');submit.textContent=mode==='signin'?'Memeriksa akun…':mode==='signup'?'Membuat akun…':mode==='update'?'Menyimpan…':'Mengirim email…';error.textContent='';message.textContent='';
  try{
    if((mode==='signup'||mode==='update')&&data.password!==data.confirm)throw Error('Kedua password harus sama.');
    let result;
    if(mode==='signin')result=await auth.signInWithPassword({email:data.email.trim(),password:data.password});
    if(mode==='signup')result=await auth.signUp({email:data.email.trim(),password:data.password,options:{data:{full_name:data.name.trim()},emailRedirectTo:location.origin+'/'}});
    if(mode==='reset')result=await auth.resetPasswordForEmail(data.email.trim(),{redirectTo:location.origin+'/?auth=recovery'});
    if(mode==='resend')result=await auth.resend({type:'signup',email:data.email.trim(),options:{emailRedirectTo:location.origin+'/'}});
    if(mode==='update')result=await auth.updateUser({password:data.password});
    if(result?.error)throw result.error;
    form.reset();
    if(mode==='signup'&&!result.data.session){authDialog('signin');modal.querySelector('[name=email]').value=data.email.trim();modal.querySelector('.auth-message').textContent='Jika pendaftaran dapat diproses, email verifikasi akan dikirim. Periksa inbox dan folder spam, konfirmasi email, lalu masuk di sini.';return;}
    if(mode==='resend'){message.textContent='Jika akun masih menunggu konfirmasi, email verifikasi baru akan dikirim. Gunakan tautan terbaru di inbox atau folder spam.';return;}
    if(mode==='reset'){message.textContent='Jika email terdaftar, tautan pemulihan akan dikirim. Periksa inbox dan folder spam.';return;}
    if(mode==='update')window.uangflowRecovery=false;
    modal.close();isDemo=false;importRows=[];coachAnswer='';page='dashboard';await init();toast(mode==='update'?'Password berhasil diperbarui.':'Berhasil masuk.');
  }catch(e){error.textContent=e.message==='Invalid login credentials'?'Email atau password tidak sesuai.':e.code==='email_not_confirmed'?'Email belum dikonfirmasi. Buka tautan terbaru di inbox atau pilih Kirim ulang konfirmasi email.':e.message;}
  finally{submit.disabled=false;submit.removeAttribute('aria-busy');submit.textContent=submitLabel;}
}
function transactionDialog(id='',preset={}){
  const existing=state.transactions.find(t=>t.id===id),t=existing||{date:today(),amount:'',type:'expense',category:'Lainnya',status:'completed',description:'',reference:'',source:'manual',...preset};
  openDialog(`<h2>${existing?'Ubah':'Catat'} transaksi</h2><form id="tx-form" data-id="${escape(id)}"><div class="form-grid">${input('description','Deskripsi',t.description,'text','required maxlength="200"')}${input('amount','Nominal (Rp)',t.amount,'number','min="1" max="1000000000" step="1" required')}${input('date','Tanggal',t.date,'date','required')}${select('type','Jenis',TYPES,t.type)}${select('category','Kategori',CATEGORIES,t.category)}${select('status','Status',STATUSES,t.status)}${input('reference','Referensi (opsional)',t.reference,'text','maxlength="200"')}${select('refundOf','Pengeluaran asli (untuk pengembalian)',Object.fromEntries(state.transactions.filter(x=>x.type==='expense'&&x.status==='completed'&&x.id!==id).map(x=>[x.id,x.description+' · '+money(x.amount)])),t.refundOf,'Tidak dihubungkan')}${select('billId','Tagihan (untuk pengeluaran)',Object.fromEntries(state.bills.map(b=>[b.id,b.name])),t.billId,'Tidak dihubungkan')}${select('goalId','Tabungan (untuk transfer)',Object.fromEntries(state.goals.map(g=>[g.id,g.name])),t.goalId,'Transfer biasa')}</div><p class="muted">Transfer biasa tidak mengubah total dana gabungan. Transfer tabungan memisahkan dana dari uang yang dapat dibelanjakan.</p><p class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">Simpan transaksi</button>${existing?button('delete-tx','Hapus','danger',`data-id="${escape(id)}"`):''}${button('close-modal','Batal','secondary')}</div></form>`);
}
function billDialog(id=''){
  const b=state.bills.find(x=>x.id===id)||{name:'',amount:'',due:today()};
  openDialog(`<h2>${id?'Ubah':'Tambah'} tagihan</h2><form id="bill-form" data-id="${escape(id)}">${input('name','Nama tagihan',b.name,'text','required maxlength="100"')}${input('amount','Nominal (Rp)',b.amount,'number','min="1" max="1000000000" step="1" required')}${input('due','Jatuh tempo',b.due,'date','required')}<p class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">Simpan tagihan</button>${id?button('delete-bill','Hapus','danger',`data-id="${escape(id)}"`):''}</div></form>`);
}
function goalDialog(id=''){
  const g=state.goals.find(x=>x.id===id)||{name:'',target:'',date:'',existing:0,reserve:0};
  openDialog(`<h2>${id?'Ubah':'Buat'} target tabungan</h2><form id="goal-form" data-id="${escape(id)}">${input('name','Nama target',g.name,'text','required maxlength="100"')}<div class="form-grid">${input('target','Target (Rp)',g.target,'number','min="1" max="1000000000" step="1" required')}${input('date','Tanggal target',g.date,'date','required')}${input('existing','Tabungan awal di luar dana tersedia (Rp)',g.existing,'number','min="0" max="1000000000" step="1" required')}${input('reserve','Rencana alokasi periode ini (Rp)',g.reserve,'number','min="0" max="1000000000" step="1" required')}</div><p class="form-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit">Simpan target</button>${id?button('delete-goal','Hapus','danger',`data-id="${escape(id)}"`):''}</div></form>`);
}
function download(name,text,type='text/csv;charset=utf-8'){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function init(){
  root.innerHTML=`<main id="main" class="loading" aria-busy="true"><div class="loading-brand" aria-hidden="true">${icon('leaf')}<span>UangFlow</span></div><p role="status">Memuat catatanmu…</p><div class="loading-skeleton" aria-hidden="true"><i></i><i></i><i></i><i></i></div><small>Menyiapkan ruang keuanganmu.</small></main>`;
  try{const r=await apiFetch('/api/state',{cache:'no-store',signal:AbortSignal.timeout(15000)}),data=await r.json();if(!r.ok)throw Error(data.error||'Gagal memuat.');user=data.user;state=load({getItem:()=>JSON.stringify(data.state)});personal=state;revision=data.revision;render();}
  catch(e){root.innerHTML=`<main class="welcome"><h1>Catatan belum bisa dimuat.</h1><p>${escape(e.message)}</p><p>Data Anda tidak dihapus. Muat ulang untuk mencoba lagi.</p>${button('reload','Coba lagi')} ${button('signin','Masuk kembali','secondary')} ${button('signout','Keluar','text-link')}</main>`;}
}
auth?.onAuthStateChange((event,session)=>{
  setTimeout(()=>{
    if(event==='PASSWORD_RECOVERY'){window.uangflowRecovery=true;authDialog('update');return;}
    if(event==='SIGNED_OUT'&&user?.provider==='supabase'){
      user=null;state=blank();personal=null;isDemo=false;page='dashboard';render();
      if(pendingChanges)toast('Sesi berakhir. Unduh salinan perubahan sebelum memuat ulang.');
    }
    if(event==='SIGNED_IN'&&user?.provider==='supabase'&&user.id!=='supabase:'+session?.user.id){user=null;state=blank();personal=null;isDemo=false;page='dashboard';render();toast('Akun berubah. Masuk kembali untuk memuat catatan.');}
  },0);
});
document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action],[data-page]');if(!target)return;
  const action=target.dataset.action,id=target.dataset.id;
  try{
    if(action==='signin'||action==='signup'){authDialog(action);return;}
    if(action==='reset-password'){authDialog('reset');return;}
    if(action==='resend-confirmation'){const email=modal.querySelector('[name=email]')?.value||'';authDialog('resend');modal.querySelector('[name=email]').value=email;return;}
    if(action==='google-signin'){
      if(!auth||!window.uangflowGoogle)throw Error('Login Google belum diaktifkan.');
      const {error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/'}});if(error)throw error;return;
    }
    if(action==='signout'){
      if(saving)throw Error('Tunggu hingga penyimpanan selesai.');
      if(pendingChanges){download('uangflow-belum-tersimpan.json',JSON.stringify(pendingChanges,null,2),'application/json');if(!confirm('Salinan perubahan sudah diunduh. Keluar dari akun?'))return;}
      if(auth){const {error}=await auth.signOut({scope:'local'});if(error)throw error;}
      location.assign('/signout-with-chatgpt?return_to=%2F');return;
    }
    if(target.dataset.page){page=target.dataset.page;render();window.scrollTo(0,0);document.querySelector('#main')?.focus({preventScroll:true});return;}
    if(action==='demo'){personal=state;state=demo();isDemo=true;page='dashboard';render();}
    if(action==='exit-demo'){state=personal||blank();isDemo=false;importRows=[];coachAnswer='';page='dashboard';render();}
    if(action==='onboard'){page='settings';render();}
    if(action==='reload')location.reload();
    if(action==='close-modal')modal.close();
    if(action==='add-tx')transactionDialog();
    if(action==='edit-tx')transactionDialog(id);
    if(action==='add-bill'||action==='edit-bill')billDialog(id);
    if(action==='add-goal'||action==='edit-goal')goalDialog(id);
    if(action==='pay-bill'){const b=state.bills.find(x=>x.id===id);transactionDialog('',{description:b.name,amount:summary(state).billRemaining(b),category:'Tagihan',billId:id});}
    if(action==='save-goal'){const g=state.goals.find(x=>x.id===id);transactionDialog('',{description:'Alokasi: '+g.name,amount:summary(state).goalReserve(g)||'',type:'transfer',goalId:id});}
    if(action==='delete-tx'){
      if(state.transactions.some(t=>t.refundOf===id))throw Error('Hapus atau lepaskan pengembalian terkait sebelum menghapus pengeluaran asli.');
      if(confirm('Hapus transaksi ini?')){const next=structuredClone(state);next.transactions=next.transactions.filter(t=>t.id!==id);await commit(next);modal.close();render();}
    }
    if(action==='delete-bill'||action==='delete-goal'){
      const field=action==='delete-bill'?'billId':'goalId',list=action==='delete-bill'?'bills':'goals';
      if(state.transactions.some(t=>t[field]===id))throw Error('Lepaskan hubungan transaksi sebelum menghapus rencana ini.');
      if(confirm('Hapus rencana ini?')){const next=structuredClone(state);next[list]=next[list].filter(x=>x.id!==id);await commit(next);modal.close();render();}
    }
    if(action==='delete-all'&&confirm(isDemo?'Hapus data demo?':'Hapus semua data keuangan di akun Anda? Unduh salinan terlebih dahulu.')){await commit(blank());page='dashboard';importRows=[];coachAnswer='';render();}
    if(action==='export')download('uangflow-transaksi.csv',csvExport(state.transactions));
    if(action==='backup')download('uangflow-salinan.json',JSON.stringify(pendingChanges||state,null,2),'application/json');
    if(action==='sample')download('uangflow-contoh.csv',HEADERS.join(',')+'\n'+today()+',25000,expense,Makan siang,Makanan,completed,CONTOH-001\n');
    if(action==='reset-filters'){filters={search:'',category:'',type:'',status:'',from:'',to:''};render();}
    if(action==='ask')answer(target.dataset.question);
    if(action==='import-cancel'){importRows=[];render();}
    if(action==='import-confirm'){
      const rows=inspectImports().filter(r=>r.included);if(!rows.length)throw Error('Pilih setidaknya satu baris.');if(rows.some(r=>r.error))throw Error('Koreksi atau keluarkan baris tidak valid terlebih dahulu.');
      if(rows.some(r=>r.possible)&&!confirm('Ada kemungkinan duplikat. Tetap impor baris terpilih?'))return;
      if(!confirm('Simpan '+rows.length+' transaksi dari CSV?'))return;
      const next=structuredClone(state);next.transactions.push(...rows.map(r=>({...r.tx,id:uid()})));next.lastImport=today();await commit(next);importRows=[];render();
    }
  }catch(e){toast(e.message);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id==='auth-form'){event.preventDefault();await submitAuth(form);return;}if(!['settings-form','tx-form','bill-form','goal-form','budget-form','filters','coach-form'].includes(form.id))return;event.preventDefault();
  const raw=Object.fromEntries(new FormData(form)),id=form.dataset.id;const submit=form.querySelector('[type=submit]'),submitLabel=submit.innerHTML;
  try{
    if(form.id==='filters'){if(raw.from&&raw.to&&raw.from>raw.to)throw Error('Tanggal akhir harus setelah tanggal awal.');filters=raw;render();return;}
    if(form.id==='coach-form'){answer(raw.question);return;}
    submit.disabled=true;submit.setAttribute('aria-busy','true');submit.textContent='Menyimpan…';const next=structuredClone(state);
    if(form.id==='settings-form'){
      if(!validDate(raw.openingDate)||raw.openingDate>today()||(raw.nextDate&&!validDate(raw.nextDate)))throw Error('Periksa tanggal dana awal dan uang saku.');
      if(state.onboarded&&(raw.openingDate!==state.settings.openingDate||Number(raw.opening)!==state.settings.opening)&&!confirm('Mengubah dana awal mengubah dasar semua estimasi. Lanjutkan?'))return;
      next.settings={cycle:raw.cycle,nextDate:raw.nextDate,openingDate:raw.openingDate,opening:amount(raw.opening)};next.onboarded=true;
    }
    if(form.id==='budget-form')next.budgets=Object.fromEntries(CATEGORIES.map(c=>[c,amount(raw[c])]));
    if(form.id==='tx-form'){
      const existing=state.transactions.find(t=>t.id===id),tx=transaction({...raw,id:id||uid(),source:existing?.source||'manual'}),others=next.transactions.filter(t=>t.id!==id);
      validateLinks(tx,others,next.bills,next.goals);
      if(duplicate(tx,others)&&!confirm('Kemungkinan transaksi duplikat. Tetap simpan?'))return;
      next.transactions=existing?next.transactions.map(t=>t.id===id?tx:t):[...next.transactions,tx];
    }
    if(form.id==='bill-form'){
      if(!validDate(raw.due))throw Error('Tanggal tagihan tidak valid.');const b={id:id||uid(),name:raw.name.trim(),amount:amount(raw.amount),due:raw.due};if(!b.amount)throw Error('Nominal tagihan harus lebih dari nol.');next.bills=id?next.bills.map(x=>x.id===id?b:x):[...next.bills,b];
    }
    if(form.id==='goal-form'){
      const g={id:id||uid(),name:raw.name.trim(),target:amount(raw.target),existing:amount(raw.existing),reserve:amount(raw.reserve),date:raw.date};if(!g.target||g.existing>g.target||!validDate(g.date))throw Error('Periksa nominal target, tabungan awal, dan tanggal.');next.goals=id?next.goals.map(x=>x.id===id?g:x):[...next.goals,g];
    }
    await commit(next);if(modal.open)modal.close();if(form.id==='settings-form')page='dashboard';render();
  }catch(e){const error=form.querySelector('.form-error');if(error)error.textContent=e.message;else toast(e.message);}
  finally{submit.disabled=false;submit.removeAttribute('aria-busy');submit.innerHTML=submitLabel;}
});
document.addEventListener('change',async event=>{
  const e=event.target;
  if(e.id==='csv-file'){
    try{const file=e.files[0];if(!file)return;if(file.size>1_000_000)throw Error('File maksimal 1 MB.');toast('Membaca file…');importRows=parseCSV(await file.text());render();toast('Periksa baris sebelum menyimpan.');}catch(error){toast(error.message);e.value='';}
  }
  if(e.dataset.importIndex!==undefined){const row=importRows[Number(e.dataset.importIndex)];if(e.hasAttribute('data-include'))row.included=e.checked;else{row.raw[e.dataset.column]=e.value;row.shapeError='';}render();}
});
await init();
if(window.uangflowRecovery)authDialog('update');
else if(window.uangflowAuthError){authDialog('signin');modal.querySelector('.form-error').textContent=window.uangflowAuthError;}
