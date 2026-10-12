package org.uangflow.dana;

import android.app.Notification;
import android.content.ComponentName;
import android.content.Context;
import android.service.notification.*;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class DanaListener extends NotificationListenerService {
    private static DanaListener connected;
    public static boolean isConnected(){return connected!=null;}
    public static void check(Context context){
        if(Queue.prefs(context).getString("token","").isEmpty()){Queue.prefs(context).edit().putString("listener_status","Hubungkan kunci perangkat terlebih dahulu.").apply();return;}
        if(connected!=null){connected.checkActive();return;}
        Queue.prefs(context).edit().putString("listener_status","Listener belum tersambung. Menghubungkan ulang; jika tetap terputus, matikan lalu aktifkan akses notifikasi UangFlow.").apply();
        try{requestRebind(new ComponentName(context,DanaListener.class));}catch(Exception e){Queue.prefs(context).edit().putString("listener_status","Android menolak koneksi listener. Periksa akses notifikasi UangFlow.").apply();}
    }
    @Override public void onListenerConnected(){connected=this;checkActive();SyncJob.schedule(this);}
    @Override public void onListenerDisconnected(){if(connected==this)connected=null;}
    @Override public void onDestroy(){if(connected==this)connected=null;super.onDestroy();}
    private void checkActive(){
        if(Queue.prefs(this).getString("token","").isEmpty())return;
        try{
            StatusBarNotification[] active=getActiveNotifications();
            if(active==null)throw new IllegalStateException();
            int count=0;
            for(StatusBarNotification item:active)if("id.dana".equals(item.getPackageName())){count++;onNotificationPosted(item);}
            if(count==0)Queue.prefs(this).edit().putString("listener_status","Tidak ada notifikasi id.dana yang dapat dibaca di panel ini. Periksa profil HP dan apakah notifikasi masih ada.").apply();
        }catch(Exception e){Queue.prefs(this).edit().putString("listener_status","Panel notifikasi belum dapat dibaca. Periksa akses notifikasi UangFlow.").apply();}
    }
    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(!"id.dana".equals(sbn.getPackageName())||Queue.prefs(this).getString("token","").isEmpty())return;
        Notification n=sbn.getNotification();
        if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0){Queue.prefs(this).edit().putString("listener_status","Ringkasan grup DANA terdeteksi; hanya notifikasi transaksi individual yang diproses.").apply();return;}
        long posted=n.when>0?n.when:sbn.getPostTime();
        if(!Capture.current(posted,Queue.prefs(this).getLong("since",Long.MAX_VALUE),System.currentTimeMillis())){Queue.prefs(this).edit().putString("listener_status","DANA terdeteksi, tetapi waktunya sebelum perangkat terhubung, terlalu lama, atau tidak valid. Pesan tidak dikirim.").apply();return;}
        if(n.extras==null){Queue.prefs(this).edit().putString("listener_status","DANA terdeteksi, tetapi isi notifikasi tidak tersedia untuk dibaca.").apply();return;}
        String title=String.valueOf(n.extras.getCharSequence(Notification.EXTRA_TITLE,""));
        String text=String.valueOf(n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT,n.extras.getCharSequence(Notification.EXTRA_TEXT,"")));
        if(!Capture.accept(title,text)){Queue.prefs(this).edit().putString("listener_status","DANA terdeteksi, tetapi isi sensitif atau format transaksi belum dikenali. Pesan tidak dikirim.").apply();return;}
        try{
            // shortcut: notification key + original timestamp identifies updates; calibrate if DANA changes notification identity.
            byte[] digest=MessageDigest.getInstance("SHA-256").digest((sbn.getKey()+"|"+posted).getBytes(StandardCharsets.UTF_8));
            StringBuilder id=new StringBuilder();for(byte b:digest)id.append(String.format("%02x",b&255));
            JSONObject event=new JSONObject().put("packageName","id.dana").put("eventId",id.toString()).put("postedAt",posted).put("title",Capture.redact(title,100)).put("text",Capture.redact(text,700));
            Queue.add(this,event);Queue.prefs(this).edit().putString("listener_status","Notifikasi transaksi DANA dikenali. Periksa status pengiriman dan menu Transaksi di website.").apply();SyncJob.schedule(this);
        }catch(Exception e){Queue.prefs(this).edit().putString("status","Notifikasi belum disimpan. Periksa catatan di DANA.").apply();}
    }
}
