export const landingMarkup=()=>`
<div class="landing">    <header class="header">
      <a class="brand" href="/" data-page="beranda" aria-label="UangFlow, beranda"><span class="brand-icon" aria-hidden="true"><img src="/glass/assets/uangflow-symbol.png" width="1254" height="1254" alt=""></span><span class="brand-wordmark"><img src="/glass/assets/uangflow-horizontal.png" width="442" height="196" alt="UangFlow"></span></a>
      <nav class="glass nav" aria-label="Navigasi utama"><button type="button" data-action="open-dashboard">Dashboard</button><button type="button" data-page="panduan">Cara kerja</button><button type="button" data-page="bantuan">Bantuan</button></nav>
    </header><main><section class="hero" id="main" tabindex="-1"  aria-labelledby="hero-title">
    <div class="scene" aria-hidden="true"><canvas id="ocean"></canvas><div class="scene-fallback"></div></div>

    <div class="hero-copy"><h1 id="hero-title">Kenali arus<br>uangmu.</h1><p>Catat transaksi, atur anggaran, dan pantau tabunganmu. Semua tersimpan terpisah di akunmu.</p></div>
    <div class="object-stage" id="object-stage">
      <article class="glass money-card" id="money-card" data-ui aria-label="Kartu identitas UangFlow">
        <svg class="card-chip" viewBox="0 0 32 38" aria-hidden="true"><rect x="1" y="1" width="30" height="36" rx="4" fill="currentColor"/><path d="M8 1v11H1m15-11v11m8-11v11h7M1 16h30M1 24h30M8 24v13m8-13v13m8-13v13" fill="none" stroke="#24496e" stroke-width="2"/></svg>
        <span class="card-symbol" aria-hidden="true"><img src="/glass/assets/uangflow-symbol.png" width="1254" height="1254" alt=""></span>
        <span class="card-wordmark">UangFlow</span>
      </article>
    </div>
    <p class="hero-note">Satu tempat untuk melihat<br>transaksi dan rencana.</p>
    <div class="hero-bottom"><div class="hero-actions"><button class="button primary" type="button" data-action="signin">Masuk / Daftar <span aria-hidden="true">↗</span></button><button class="text-link" type="button" data-action="demo">Jelajahi demo</button></div><p>Transaksi · Anggaran · Tabungan<br>Impor CSV · DANA Android</p></div>
  </section></main></div>`;

export const wordmarkFilter=`<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><filter id="white-wordmark" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.2126 -0.7152 -0.0722 0 1"/><feComponentTransfer><feFuncA type="linear" slope="1.4"/></feComponentTransfer></filter></defs></svg>`;
