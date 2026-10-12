import {MAX_AMOUNT} from './domain.js';

export function notification(raw,now=Date.now()) {
  if(!raw||raw.packageName!=='id.dana'||typeof raw.eventId!=='string'||!/^[a-f0-9]{64}$/.test(raw.eventId)||!Number.isSafeInteger(raw.postedAt)||raw.postedAt<now-7*86400000||raw.postedAt>now+300000)throw Error('Notifikasi tidak valid atau terlalu lama.');
  if(typeof raw.title!=='string'||typeof raw.text!=='string'||raw.title.length>200||raw.text.length>1000)throw Error('Isi notifikasi terlalu panjang.');
  const text=(raw.title+' '+raw.text).replace(/\s+/g,' ').trim();
  if(/\b(otp|pin|password|kata sandi|kode verifikasi|verification code)\b/i.test(text))return null;
  if(!/\b(pembayaran|bayar|membayar|dibayar|terbayar|pembelian|belanja|pengeluaran|mengeluarkan|uang keluar|dana keluar|saldo berkurang|payment|pay|paid|purchase|spent|spending|expense|expenses|debit|debited|cash out|qris|transfer|ditransfer|terkirim|dikirim|dikirimkan|mengirimkan|mengirim|kirim uang|sent|send|pemasukan|penerimaan|pendapatan|penghasilan|menerima|diterima|terima uang|uang masuk|dana masuk|saldo bertambah|received|receive|income|credit|credited|cash in|top.?up|isi saldo|deposit|withdrawal|penarikan)\b/i.test(text))return null;
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(raw.postedAt));
  // shortcut: explicit payment/receipt direction and one IDR amount only; calibrate new DANA formats before widening automatic capture.
  const amounts=[...text.matchAll(/(?:Rp\.?|IDR)\s*([-+]?\d[\d.,]*)/gi)];
  let value=null;
  if(amounts.length===1){
    const number=amounts[0][1];
    if(/^(?:[1-9]\d{0,2}(?:\.\d{3})+|[1-9]\d*)(?:,00)?$/.test(number)){
      const parsed=Number(number.replace(/,00$/,'').replaceAll('.',''));
      if(Number.isSafeInteger(parsed)&&parsed<=MAX_AMOUNT)value=parsed;
    }
  }
  const ambiguous=/\b(gagal|failed|unsuccessful|ditolak|declined|tertunda|ditunda|pending|menunggu|proses|processing|refund|pengembalian|transfer|top.?up|saldo|cashback|promo|diskon|voucher|hingga|sampai|up to|belum|tidak|tak|batal|dibatalkan|cancel|cancelled|canceled|not|akan|will|biaya|fee)\b/i.test(text);
  const successful=/\b(berhasil|sukses|successful|successfully|completed)\b/i.test(text);
  const received=/\b(?:kamu|anda|you)\s+(?:(?:telah|berhasil|have|successfully)\s+){0,2}(?:menerima|received)\b/i.test(text);
  const incoming=received||/\b(?:uang|dana)\s+(?:masuk|(?:telah\s+)?diterima)\b/i.test(text);
  const payment=/\b(pembayaran|bayar|payment|paid|qris)\b/i.test(text);
  const outgoing=/\b(mengirim|kirim uang|terkirim|dikirim|dikirimkan|mengirimkan|sent|send|membayar|pengeluaran|uang keluar|dana keluar|expense|expenses|debit|debited|cash out|withdrawal|penarikan|belanja|pembelian|spent|spending|purchase|pay)\b/i.test(text);
  const type=incoming&&!payment&&!outgoing&&(successful||received)?'income':payment&&!incoming&&!/\b(masuk|terima|diterima|received|receive|pemasukan|penerimaan|pendapatan|penghasilan|income|credit|credited|cash in)\b/i.test(text)&&successful?'expense':null;
  const tx=value&&!ambiguous&&type?{date,amount:value,type,status:'completed',category:'Lainnya',description:type==='income'?'Pemasukan DANA':'Pembayaran DANA',reference:raw.eventId,source:'dana'}:null;
  const message=text.replace(/\b\d{6,}\b/g,'[nomor disamarkan]').slice(0,500);
  return {date,message,tx};
}
