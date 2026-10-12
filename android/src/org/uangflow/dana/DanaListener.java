package org.uangflow.dana;

import android.app.Notification;
import android.service.notification.*;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class DanaListener extends NotificationListenerService {
    @Override public void onListenerConnected(){SyncJob.schedule(this);}
    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(!"id.dana".equals(sbn.getPackageName())||Queue.prefs(this).getString("token","").isEmpty())return;
        Notification n=sbn.getNotification();
        if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
        long posted=n.when>0?n.when:sbn.getPostTime();
        if(posted<Queue.prefs(this).getLong("since",Long.MAX_VALUE)||posted>System.currentTimeMillis()+300000)return;
        String title=String.valueOf(n.extras.getCharSequence(Notification.EXTRA_TITLE,""));
        String text=String.valueOf(n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT,n.extras.getCharSequence(Notification.EXTRA_TEXT,"")));
        if(!Capture.accept(title,text))return;
        try{
            // shortcut: notification key + original timestamp identifies updates; calibrate if DANA changes notification identity.
            byte[] digest=MessageDigest.getInstance("SHA-256").digest((sbn.getKey()+"|"+posted).getBytes(StandardCharsets.UTF_8));
            StringBuilder id=new StringBuilder();for(byte b:digest)id.append(String.format("%02x",b&255));
            JSONObject event=new JSONObject().put("packageName","id.dana").put("eventId",id.toString()).put("postedAt",posted).put("title",Capture.redact(title,100)).put("text",Capture.redact(text,700));
            Queue.add(this,event);SyncJob.schedule(this);
        }catch(Exception e){Queue.prefs(this).edit().putString("status","Notifikasi belum disimpan. Periksa catatan di DANA.").apply();}
    }
}
