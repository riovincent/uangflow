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
      document.body.appendChild(script);
    })();
  },[]);
  return <><a className="skip" href="#main">Lewati navigasi</a><div id="app"><main className="loading" aria-live="polite">Menyiapkan UangFlow…</main></div><div id="toast" role="status" aria-live="polite"/><dialog id="modal"/></>;
}
