import {MAX_AMOUNT} from './domain.js';

export function notification(raw,now=Date.now()) {
  if(!raw||raw.packageName!=='id.dana'||typeof raw.eventId!=='string'||!/^[a-f0-9]{64}$/.test(raw.eventId)||!Number.isSafeInteger(raw.postedAt)||raw.postedAt<now-7*86400000||raw.postedAt>now+300000)throw Error('Notifikasi tidak valid atau terlalu lama.');
  if(typeof raw.title!=='string'||typeof raw.text!=='string'||raw.title.length>200||raw.text.length>1000)throw Error('Isi notifikasi terlalu panjang.');
  const text=(raw.title+' '+raw.text).replace(/\s+/g,' ').trim();
  if(/\b(otp|pin|password|kata sandi|kode verifikasi|verification code)\b/i.test(text))return null;
  if(!/\b(pembayaran|bayar|payment|paid|qris)\b/i.test(text))return null;
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(raw.postedAt));
  // shortcut: only explicit successful payments with one unambiguous IDR amount; other formats require review.
  const amounts=[...text.matchAll(/(?:Rp\.?|IDR)\s*([-+]?\d[\d.,]*)/gi)];
  let value=null;
  if(amounts.length===1){
    const number=amounts[0][1];
    if(/^(?:[1-9]\d{0,2}(?:\.\d{3})+|[1-9]\d*)(?:,00)?$/.test(number)){
      const parsed=Number(number.replace(/,00$/,'').replaceAll('.',''));
      if(Number.isSafeInteger(parsed)&&parsed<=MAX_AMOUNT)value=parsed;
    }
  }
  const ambiguous=/\b(gagal|failed|pending|menunggu|proses|processing|refund|pengembalian|transfer|top.?up|saldo|cashback|promo|diskon|voucher|hingga|sampai|up to|belum|tidak|batal|cancelled|canceled|not|masuk|terima|diterima|received|biaya|fee)\b/i.test(text);
  const successful=/\b(berhasil|sukses|successful|successfully|completed)\b/i.test(text);
  const tx=value&&!ambiguous&&successful?{date,amount:value,type:'expense',status:'completed',category:'Lainnya',description:'Pembayaran DANA',reference:raw.eventId,source:'dana'}:null;
  const message=text.replace(/\b\d{6,}\b/g,'[nomor disamarkan]').slice(0,500);
  return {date,message,tx};
}
