package org.uangflow.dana;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.View;
import android.widget.*;

public class MainActivity extends Activity {
    private TextView status;
    private EditText token;
    private final int green=Color.rgb(8,118,91);
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll=new ScrollView(this);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(28,48,28,32);scroll.addView(layout);setContentView(scroll);
        scroll.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        text(layout,"UangFlow DANA",28,true);
        text(layout,"Catatan dari notifikasi, tanpa PIN atau OTP.",18,false);
        text(layout,"Android memberikan akses ke notifikasi. Aplikasi ini hanya memproses notifikasi dari id.dana yang berkaitan dengan pemasukan dan pengeluaran, dan mengabaikan pesan OTP/PIN. Pesan dikirim melalui HTTPS ke uangflow.org untuk dicatat atau ditinjau. Tidak membaca layar DANA, SMS, saldo, atau riwayat lama. Tidak memindahkan uang.",16,false);
        text(layout,"1. Masuk ke uangflow.org → Pengaturan → Buat kunci perangkat.",16,true);
        TextView label=text(layout,"2. Masukkan kunci perangkat",16,true);
        token=new EditText(this);token.setId(View.generateViewId());label.setLabelFor(token.getId());token.setSingleLine(true);token.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);token.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);token.setHint("uf_dana_…");layout.addView(token);
        button(layout,"Hubungkan perangkat",v->connect());
        button(layout,"3. Izinkan akses notifikasi",v->new AlertDialog.Builder(this).setTitle("Izin akses notifikasi").setMessage("Aktifkan UangFlow di pengaturan akses notifikasi. Android memberi akses luas, tetapi aplikasi hanya memproses notifikasi transaksi DANA. Kamu bisa mencabut izin kapan saja.").setPositiveButton("Buka pengaturan",(d,w)->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))).setNegativeButton("Batal",null).show());
        status=text(layout,"",16,true);
        button(layout,"Kirim ulang antrean",v->{Queue.prefs(this).edit().putBoolean("blocked",false).apply();SyncJob.schedule(this);updateStatus();});
        button(layout,"Buka tabel UangFlow",v->startActivity(new Intent(Intent.ACTION_VIEW,android.net.Uri.parse("https://uangflow.org/"))));
        button(layout,"Putuskan di HP ini",v->new AlertDialog.Builder(this).setTitle("Putuskan koneksi?").setMessage("Kunci dan antrean di HP akan dihapus. Untuk membatalkan kunci server, gunakan Putuskan koneksi HP di Pengaturan UangFlow.").setPositiveButton("Putuskan",(d,w)->{Queue.clear(this);updateStatus();}).setNegativeButton("Batal",null).show());
        text(layout,"Versi uji 0.2.0 · Periksa beberapa catatan pertama. Jika format notifikasi belum jelas, pesan masuk untuk ditinjau. Pastikan notifikasi transaksi DANA aktif. Antrean saat offline disimpan di HP dan dikirim saat koneksi tersedia; tidak menjamin penangkapan semua transaksi.",14,false);
    }
    private TextView text(LinearLayout layout,String value,int size,boolean bold){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(bold?green:Color.rgb(36,55,62));if(bold)t.setTypeface(null,1);t.setPadding(0,12,0,12);layout.addView(t);return t;}
    private void button(LinearLayout layout,String value,View.OnClickListener action){Button b=new Button(this);b.setText(value);b.setAllCaps(false);b.setMinHeight(52);layout.addView(b);b.setOnClickListener(action);}
    private void connect(){
        final String key=token.getText().toString().trim();
        if(!key.matches("uf_dana_[a-f0-9]{64}")){token.setError("Salin kunci lengkap dari UangFlow.");return;}
        new AlertDialog.Builder(this).setTitle("Hubungkan akun UangFlow?").setMessage("Setelah izin notifikasi aktif, notifikasi transaksi DANA baru akan dikirim ke akun yang membuat kunci ini. Menghubungkan ulang menghapus antrean lama di HP.").setPositiveButton("Hubungkan",(d,w)->{
            status.setText("Memeriksa koneksi…");
            new Thread(()->{try{int code=Queue.request(key,null);runOnUiThread(()->{if(code==200){Queue.pair(this,key);token.setText("");updateStatus();}else status.setText(code==401?"Kunci tidak aktif. Buat kunci baru di UangFlow.":"Koneksi belum berhasil ("+code+"). Coba lagi.");});}catch(Exception e){runOnUiThread(()->status.setText("Internet belum tersedia. Kunci belum disimpan."));}}).start();
        }).setNegativeButton("Batal",null).show();
    }
    @Override public void onResume(){super.onResume();if(status!=null)updateStatus();}
    private void updateStatus(){
        String listeners=Settings.Secure.getString(getContentResolver(),"enabled_notification_listeners");
        boolean permitted=listeners!=null&&listeners.contains(new ComponentName(this,DanaListener.class).flattenToString());
        status.setText((Queue.prefs(this).getString("token","").isEmpty()?"Belum terhubung":"Kunci tersimpan")+" · "+(permitted?"Izin notifikasi aktif":"Izin notifikasi belum aktif")+"\nAntrean: "+Queue.count(this)+"\n"+Queue.prefs(this).getString("status","Belum menerima notifikasi."));
    }
}
