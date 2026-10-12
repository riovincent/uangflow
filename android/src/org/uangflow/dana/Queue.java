package org.uangflow.dana;
import android.content.*;
import android.app.job.JobScheduler;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class Queue {
    public static SharedPreferences prefs(Context c){return c.getSharedPreferences("dana",Context.MODE_PRIVATE);}
    public static synchronized void pair(Context c,String token){prefs(c).edit().clear().putString("token",token).putLong("since",System.currentTimeMillis()).putString("queue","[]").commit();((JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE)).cancel(1);}
    public static synchronized void clear(Context c){prefs(c).edit().clear().commit();((JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE)).cancel(1);}
    private static JSONArray array(Context c)throws JSONException{return new JSONArray(prefs(c).getString("queue","[]"));}
    public static synchronized int count(Context c){try{return array(c).length();}catch(Exception e){return -1;}}
    public static synchronized void add(Context c,JSONObject event)throws JSONException{
        JSONArray a=array(c);String id=event.getString("eventId");
        for(int i=0;i<a.length();i++)if(a.getJSONObject(i).getString("eventId").equals(id))return;
        if(a.length()>=500){prefs(c).edit().putString("status","Antrean penuh. Notifikasi baru belum tercatat; periksa DANA dan kirim ulang antrean.").commit();return;}
        a.put(event);if(!prefs(c).edit().putString("queue",a.toString()).commit())throw new JSONException("Storage unavailable");
    }
    public static synchronized JSONObject first(Context c)throws JSONException{JSONArray a=array(c);return a.length()==0?null:a.getJSONObject(0);}
    public static synchronized void remove(Context c,String id,String token,String status)throws JSONException{
        if(!prefs(c).getString("token","").equals(token))return;
        JSONArray a=array(c),next=new JSONArray();for(int i=0;i<a.length();i++)if(!a.getJSONObject(i).getString("eventId").equals(id))next.put(a.getJSONObject(i));
        if(!prefs(c).edit().putString("queue",next.toString()).putString("status",status).commit())throw new JSONException("Storage unavailable");
    }
    public static int request(String token,JSONObject event)throws IOException{
        HttpURLConnection connection=(HttpURLConnection)new URL("https://uangflow.org/api/dana/notifications").openConnection();
        try{
            connection.setConnectTimeout(15000);connection.setReadTimeout(15000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("Authorization","Bearer "+token);
            if(event!=null){byte[] bytes=event.toString().getBytes(StandardCharsets.UTF_8);connection.setRequestMethod("POST");connection.setRequestProperty("Content-Type","application/json");connection.setDoOutput(true);connection.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=connection.getOutputStream()){out.write(bytes);}}
            return connection.getResponseCode();
        }finally{connection.disconnect();}
    }
}
