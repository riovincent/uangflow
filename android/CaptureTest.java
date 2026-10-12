import org.uangflow.dana.Capture;
public class CaptureTest {
  private static void check(boolean value){if(!value)throw new AssertionError();}
  public static void main(String[] args){
    check(Capture.accept("Pembayaran berhasil","Rp25.000 di Toko"));
    check(Capture.accept("Uang masuk","Kamu menerima Rp50.000 dari teman"));
    check(Capture.accept("DANA","You have received IDR 50000"));
    check(Capture.accept("Transfer berhasil","Kamu mengirim Rp5.000"));
    check(Capture.accept("Isi saldo","Rp50.000 berhasil"));
    check(!Capture.accept("OTP pembayaran","Kode verifikasi 123456"));
    check(!Capture.accept("PIN","Pembayaran berhasil Rp25.000"));
    check(!Capture.accept("OTP","Kamu menerima kode verifikasi 123456"));
    check(!Capture.accept("Promo","Diskon hari ini"));
    check(Capture.redact("Pembayaran Rp125000 ke 081234567890",700).equals("Pembayaran Rp125000 ke [nomor disamarkan]"));
    check(Capture.redact("Bayar IDR 125000 dan Rp. 250000",700).equals("Bayar IDR 125000 dan Rp. 250000"));
    check(Capture.redact("Pembayaran Rp25.000 akun 123456789",700).equals("Pembayaran Rp25.000 akun [nomor disamarkan]"));
    System.out.println("Capture filtering and redaction passed");
  }
}
