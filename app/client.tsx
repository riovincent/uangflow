'use client';
import {useEffect} from 'react';
export default function Client() {
  useEffect(()=>{
    if(document.getElementById('uangflow-script'))return;
    const script=document.createElement('script');
    script.id='uangflow-script';script.type='module';script.src='/app.js';
    document.body.appendChild(script);
  },[]);
  return <><a className="skip" href="#main">Lewati navigasi</a><div id="app"><main className="loading" aria-live="polite">Menyiapkan UangFlow…</main></div><div id="toast" role="status" aria-live="polite"/><dialog id="modal"/></>;
}
