package org.uangflow.dana;
import android.app.job.*;
import android.content.*;
import org.json.JSONObject;

public class SyncJob extends JobService {
    private volatile boolean stopped;
    public static void schedule(Context c){
        if(Queue.count(c)<=0||Queue.prefs(c).getString("token","").isEmpty()||Queue.prefs(c).getBoolean("blocked",false))return;
        JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(scheduler.getPendingJob(1)==null)scheduler.schedule(new JobInfo.Builder(1,new ComponentName(c,SyncJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setBackoffCriteria(30000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build());
    }
    @Override public boolean onStartJob(JobParameters params){
        stopped=false;
        new Thread(()->{
            boolean retry=false;String token=Queue.prefs(this).getString("token","");
            try{
                for(int i=0;i<50&&!stopped;i++){
                    if(token.isEmpty()||!Queue.prefs(this).getString("token","").equals(token))break;
                    JSONObject event=Queue.first(this);if(event==null)break;
                    int code=Queue.request(token,event);
                    if(code==200){Queue.remove(this,event.getString("eventId"),token,"Notifikasi terkirim. Periksa tabel atau antrean tinjauan UangFlow.");}
                    else {retry=code==429||code>=500;Queue.prefs(this).edit().putBoolean("blocked",!retry).putString("status",code==401?"Kunci sudah diputus. Hubungkan kembali; antrean tetap di HP.":"Belum terkirim ("+code+"). Antrean tetap di HP.").apply();break;}
                }
                retry=(retry||Queue.count(this)>0)&&!Queue.prefs(this).getBoolean("blocked",false);
            }catch(Exception e){retry=true;Queue.prefs(this).edit().putString("status","Internet/server belum tersedia. Antrean akan dicoba lagi.").apply();}
            if(!stopped)jobFinished(params,retry);
        }).start();return true;
    }
    @Override public boolean onStopJob(JobParameters params){stopped=true;return Queue.count(this)>0&&!Queue.prefs(this).getBoolean("blocked",false);}
}
