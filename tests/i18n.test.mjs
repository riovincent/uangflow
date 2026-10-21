import {test} from 'node:test';
import assert from 'node:assert/strict';
import {t,setLanguage,language} from '../public/i18n.js';
import {publicContent,siteHeader} from '../public/public-site.js';
globalThis.document={documentElement:{lang:'en'},dispatchEvent(){}};
test('English default, literal boundaries, dynamic copy, language persistence guard and supplied prices',()=>{
  assert.equal(language(),'en');assert.equal(t('Pengaturan'),'Settings');
  assert.equal(t('  Sisa Rp 10.000  '),'  Remaining Rp 10.000  ');
  assert.equal(t('Dihitung sejak 21 Oct 2026. Tabungan yang dialokasikan sudah dipisahkan.'),'Calculated since 21 Oct 2026. Allocated savings are already set aside.');
  assert.equal(t('username-Tanggal'),'username-Tanggal');
  assert.equal(t('Estimasi untuk Tabungan: sisa Rp 100 hingga 21 Oct 2026. Cadangan periode ini Rp 20.'),'Estimate for Tabungan: Rp 100 remaining until 21 Oct 2026. Reserved this period: Rp 20.');
  assert.match(publicContent('pricing'),/\$19\.89/);assert.match(publicContent('pricing'),/\$9\.89/);assert.match(publicContent('pricing'),/Limited time/);
  assert.match(siteHeader(),/mailto:riovincent@uangflow.org/);assert.doesNotMatch(siteHeader(),/href="(?:#|https:\/\/wa\.me\/?)"/);
  setLanguage('id');assert.equal(document.documentElement.lang,'id');assert.equal(t('Settings'),'Pengaturan');assert.equal(t('Pengaturan'),'Pengaturan');
  assert.match(publicContent('pricing'),/Rp358\.000/);assert.match(publicContent('pricing'),/Rp178\.000/);
  setLanguage('fr');assert.equal(language(),'id');setLanguage('en');
});
