'use client';
import {useEffect} from 'react';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
declare global {interface Window {uangflowAuth:SupabaseClient|null;uangflowGoogle:boolean;uangflowRecovery?:boolean;uangflowAuthReady?:boolean;uangflowAuthError?:string}}
export default function Client() {
  useEffect(()=>{
    if(window.uangflowAuthReady)return;
    window.uangflowAuthReady=true;
    void (async()=>{
      window.uangflowAuth=null;window.uangflowGoogle=false;
      try{
        const response=await fetch('/api/auth-config',{cache:'no-store',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw Error('Login config unavailable');
        const config=await response.json() as {url:string;key:string;google:boolean}|null;
        if(config){
          window.uangflowAuth=createClient(config.url,config.key,{auth:{flowType:'pkce'}});window.uangflowGoogle=config.google;
          const query=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
          if(query.has('error')||fragment.has('error'))window.uangflowAuthError='Tautan email tidak valid atau sudah kedaluwarsa. Coba masuk jika email sudah dikonfirmasi, atau kirim ulang konfirmasi email.';
          window.uangflowAuth.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')window.uangflowRecovery=true;});
          const {error}=await window.uangflowAuth.auth.getSession();
          if(error)window.uangflowAuthError='Tautan email tidak dapat membuka sesi. Coba masuk dengan email dan password; jika email belum dikonfirmasi, kirim ulang konfirmasi email dan buka tautan terbaru di browser tempat mendaftar.';
        }
      }catch{window.uangflowAuth=null;}
      const script=document.createElement('script');
      script.id='uangflow-script';script.type='module';script.src='/app.js';
      script.onerror=()=>{const loading=document.querySelector('#app');if(loading)loading.innerHTML='<main class="loading"><h1>UangFlow belum bisa dibuka.</h1><p>Periksa koneksi lalu muat ulang halaman.</p><a class="primary" href="/">Muat ulang</a></main>';};
      document.body.appendChild(script);
    })();
  },[]);
  return <><a className="skip" href="#main">Lewati navigasi</a><div id="app"><main id="main" className="loading" aria-busy="true"><div className="loading-brand" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 3C5 3 2 8 5 15s15 4 15-12 M4 20 15 9"/></svg><span>UangFlow</span></div><p role="status">Menyiapkan UangFlow…</p><div className="loading-skeleton" aria-hidden="true"><i/><i/><i/><i/></div><small>Ruang untuk rencana keuanganmu.</small></main></div><div id="toast" role="status" aria-live="polite" aria-atomic="true"/><dialog id="modal"/></>;
}
