package org.uangflow.dana;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
public class Capture {
    private static final Pattern PRIVATE=Pattern.compile("\\b(otp|pin|password|kata sandi|kode verifikasi|verification code)\\b",Pattern.CASE_INSENSITIVE);
    private static final Pattern TRANSACTION=Pattern.compile("\\b(pembayaran|bayar|payment|paid|qris|transfer|mengirim|menerima|diterima|received|income|uang masuk|dana masuk|top.?up|isi saldo)\\b",Pattern.CASE_INSENSITIVE);
    public static boolean accept(String title,String text){String full=title+" "+text;return !PRIVATE.matcher(full).find()&&TRANSACTION.matcher(full).find();}
    public static String redact(String text,int limit){
        // Keep IDR amounts intact; mask long standalone numbers such as phone/account references before sending.
        Matcher m=Pattern.compile("(?<![\\w.,])\\d{6,}(?![\\d.,])").matcher(text);
        StringBuffer result=new StringBuffer();
        while(m.find()){
            String before=text.substring(Math.max(0,m.start()-12),m.start());
            boolean money=Pattern.compile("(?:Rp\\.?|IDR)\\s*$",Pattern.CASE_INSENSITIVE).matcher(before).find();
            m.appendReplacement(result,Matcher.quoteReplacement(money?m.group():"[nomor disamarkan]"));
        }
        m.appendTail(result);String value=result.toString();
        return value.substring(0,Math.min(limit,value.length()));
    }
}
