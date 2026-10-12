export const CATEGORIES = ['Makanan','Transportasi','Belanja','Pendidikan','Hiburan','Tagihan','Lainnya'];
export const TYPES = {expense:'Pengeluaran',income:'Pemasukan',transfer:'Transfer',refund:'Pengembalian'};
export const STATUSES = {completed:'Selesai',pending:'Menunggu',failed:'Gagal'};
export const HEADERS = ['date','amount','type','description','category','status','reference'];
export const KEY = 'uangflow.personal.v1';
export const MAX_AMOUNT = 1_000_000_000;
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
export function amount(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value)>MAX_AMOUNT) throw Error('Nominal harus rupiah bulat, maksimal Rp1 miliar.');
  return Number(value);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(value+'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0,10)===value && value>='1900-01-01' && value<='2200-12-31';
}
export const days = (start,end) => Math.ceil((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);
export function blank() {
  return {version:1,onboarded:false,settings:{cycle:'monthly',nextDate:'',openingDate:today(),opening:0},transactions:[],budgets:Object.fromEntries(CATEGORIES.map(c=>[c,0])),bills:[],goals:[],lastImport:null};
}
export function transaction(raw) {
  if (!validDate(raw.date)) throw Error('Tanggal harus valid dengan format YYYY-MM-DD.');
  const value = amount(raw.amount);
  if (!value) throw Error('Nominal transaksi harus lebih dari nol.');
  if (!Object.hasOwn(TYPES,raw.type)) throw Error('Jenis: expense, income, transfer, atau refund.');
  if (!Object.hasOwn(STATUSES,raw.status)) throw Error('Status: completed, pending, atau failed.');
  if (!CATEGORIES.includes(raw.category)) throw Error('Kategori tidak dikenali.');
  if (typeof raw.description!=='string' || !raw.description.trim() || raw.description.length>200) throw Error('Deskripsi wajib diisi, maksimal 200 karakter.');
  if (typeof raw.reference!=='string' || raw.reference.length>200) throw Error('Referensi maksimal 200 karakter.');
  return {...raw,amount:value,description:raw.description.trim(),source:raw.source || 'manual',reference:raw.reference.trim()};
}
export function validateLinks(tx,others,bills=[],goals=[]) {
  if (tx.billId && (tx.type!=='expense' || !bills.some(b=>b.id===tx.billId))) throw Error('Tagihan hanya dapat dihubungkan ke pengeluaran.');
  if (tx.goalId && (tx.type!=='transfer' || !goals.some(g=>g.id===tx.goalId))) throw Error('Tabungan hanya dapat dihubungkan ke transfer.');
  if (tx.refundOf) {
    const original = others.find(t=>t.id===tx.refundOf && t.type==='expense' && t.status==='completed');
    if (tx.type!=='refund' || !original || tx.date<original.date) throw Error('Pilih pengeluaran selesai dengan tanggal sebelum pengembalian.');
    const prior = others.filter(t=>t.refundOf===original.id && t.status==='completed').reduce((s,t)=>s+t.amount,0);
    if (tx.status==='completed' && prior+tx.amount>original.amount) throw Error('Total pengembalian melebihi pengeluaran asli.');
    tx.category=original.category;
  }
}
export function duplicate(tx,others) {
  return others.some(t=> (tx.reference && t.reference===tx.reference && t.source===tx.source) || (t.date===tx.date && t.amount===tx.amount && t.type===tx.type && t.description.toLowerCase()===tx.description.toLowerCase()));
}
export function summary(state,asOf=today()) {
  const complete = state.transactions.filter(t=>t.status==='completed' && t.date<=asOf);
  const cycle = complete.filter(t=>t.date>=state.settings.openingDate);
  const change = cycle.reduce((sum,t)=>sum+(t.type==='income'||t.type==='refund'?t.amount:t.type==='expense'||(t.type==='transfer'&&t.goalId)?-t.amount:0),0);
  const available=state.settings.opening+change;
  const billRemaining=b=>Math.max(0,b.amount-cycle.filter(t=>t.billId===b.id&&t.type==='expense').reduce((s,t)=>s+t.amount,0)+cycle.filter(t=>t.type==='refund' && state.transactions.find(o=>o.id===t.refundOf)?.billId===b.id).reduce((s,t)=>s+t.amount,0));
  const remainingBills=state.bills.reduce((s,b)=>s+billRemaining(b),0);
  const goalSaved=g=>g.existing+complete.filter(t=>t.goalId===g.id&&t.type==='transfer').reduce((s,t)=>s+t.amount,0);
  const goalReserve=g=>Math.min(Math.max(0,g.target-goalSaved(g)),Math.max(0,g.reserve-cycle.filter(t=>t.goalId===g.id&&t.type==='transfer').reduce((s,t)=>s+t.amount,0)));
  const remainingSavings=state.goals.reduce((s,g)=>s+goalReserve(g),0);
  const flexible=available-remainingBills-remainingSavings;
  const until=validDate(state.settings.nextDate)?days(asOf,state.settings.nextDate):0;
  const monthly=month=>complete.filter(t=>t.date.startsWith(month)).reduce((s,t)=>s+(t.type==='expense'?t.amount:t.type==='refund'?-t.amount:0),0);
  const categories=Object.fromEntries(CATEGORIES.map(c=>[c,complete.filter(t=>t.date.startsWith(asOf.slice(0,7))&&t.category===c).reduce((s,t)=>s+(t.type==='expense'?t.amount:t.type==='refund'?-t.amount:0),0)]));
  return {available,remainingBills,remainingSavings,flexible,until,daily:until>0?Math.floor(Math.max(0,flexible)/until):null,monthly,categories,billRemaining,goalSaved,goalReserve};
}
export function parseCSV(text) {
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) {if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
    else if(c==='"') {if(cell||closed)throw Error('Tanda kutip CSV tidak valid.');quoted=true;}
    else if(c===','||c==='\n'||c==='\r') {row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v!==''))rows.push(row);row=[];}}
    else {if(closed)throw Error('Karakter setelah tanda kutip CSV tidak valid.');cell+=c;}
  }
  if(quoted)throw Error('Tanda kutip CSV belum ditutup.');
  row.push(cell);if(row.some(v=>v!==''))rows.push(row);
  if(!rows.length||rows[0].length!==HEADERS.length||rows[0].some((h,i)=>h.trim()!==HEADERS[i]))throw Error('Gunakan header dan urutan kolom pada contoh CSV.');
  if(rows.length>1001)throw Error('Maksimal 1.000 baris per impor.');
  return rows.slice(1).map(r=>({raw:Object.fromEntries(HEADERS.map((h,i)=>[h,r[i]??''])),included:true,shapeError:r.length!==HEADERS.length?'Jumlah kolom tidak sesuai.':''}));
}
export function csvExport(transactions) {
  const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  return HEADERS.join(',')+'\r\n'+transactions.map(t=>HEADERS.map(h=>quote(t[h])).join(',')).join('\r\n');
}
export function save(storage,state) {storage.setItem(KEY,JSON.stringify(state));}
export function load(storage) {
  const text=storage.getItem(KEY);if(!text)return blank();
  const s=JSON.parse(text);
  if(s.version!==1||typeof s.onboarded!=='boolean'||!s.settings||!Array.isArray(s.transactions)||s.transactions.length>10000||!Array.isArray(s.bills)||s.bills.length>100||!Array.isArray(s.goals)||s.goals.length>100)throw Error('Data tersimpan tidak valid. Ekspor salinan sebelum menghapus data.');
  s.settings.opening=amount(s.settings.opening);if(!validDate(s.settings.openingDate)||!['monthly','weekly','custom'].includes(s.settings.cycle)||(s.settings.nextDate&&!validDate(s.settings.nextDate)))throw Error('Pengaturan tersimpan tidak valid.');
  for(const c of CATEGORIES)s.budgets[c]=amount(s.budgets?.[c]);
  const ids=new Set();
  s.transactions=s.transactions.map(t=>transaction(t));
  for(const t of s.transactions){if(typeof t.id!=='string'||t.id.length>100||ids.has(t.id)||!['manual','csv','demo','dana'].includes(t.source))throw Error('ID atau sumber transaksi tidak valid.');ids.add(t.id);}
  const listIds=new Set();
  for(const b of s.bills){b.amount=amount(b.amount);if(typeof b.id!=='string'||b.id.length>100||listIds.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!validDate(b.due))throw Error('Tagihan tidak valid.');listIds.add(b.id);}
  for(const g of s.goals){g.target=amount(g.target);g.existing=amount(g.existing);g.reserve=amount(g.reserve);if(typeof g.id!=='string'||g.id.length>100||listIds.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>100||!g.target||g.existing>g.target||!validDate(g.date))throw Error('Target tidak valid.');listIds.add(g.id);}
  if(s.lastImport!==null && (typeof s.lastImport!=='string'||!validDate(s.lastImport)))throw Error('Tanggal impor tidak valid.');
  for(const t of s.transactions)validateLinks(t,s.transactions.filter(x=>x.id!==t.id),s.bills,s.goals);
  return s;
}
export function demo(asOf=today()) {
  const s=blank();s.onboarded=true;s.settings={cycle:'monthly',openingDate:asOf.slice(0,7)+'-01',opening:2_000_000,nextDate:new Date(Date.parse(asOf+'T00:00:00Z')+20*86400000).toISOString().slice(0,10)};
  s.budgets={Makanan:600000,Transportasi:250000,Belanja:200000,Pendidikan:300000,Hiburan:150000,Tagihan:200000,Lainnya:100000};
  s.bills=[{id:'bill-demo',name:'Paket internet',amount:100000,due:asOf}];
  s.goals=[{id:'goal-demo',name:'Laptop untuk kuliah',target:6000000,existing:1500000,reserve:300000,date:new Date(Date.parse(asOf+'T00:00:00Z')+180*86400000).toISOString().slice(0,10)}];
  s.transactions=[['Kopi & diskusi tugas',28000,'Makanan'],['Makan siang',22000,'Makanan'],['Perjalanan ke kampus',18000,'Transportasi'],['Buku kuliah',125000,'Pendidikan'],['Belanja kebutuhan kos',85000,'Belanja'],['Nonton akhir pekan',45000,'Hiburan']].map(([description,value,category],i)=>({id:'demo-'+i,date:asOf,amount:value,type:'expense',description,category,status:'completed',source:'demo',reference:''}));
  return s;
}
