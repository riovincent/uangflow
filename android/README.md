# UangFlow DANA — Android companion 0.1.0 (test)

Zero third-party runtime dependencies. Android API 26+ Java application: Activity, NotificationListenerService, private SharedPreferences queue and network-constrained JobScheduler. Only `id.dana` is processed. No SMS, Accessibility, screen capture, DANA credentials, analytics, or payments APIs.

Installation and privacy: https://uangflow.org/dana-android.html

Build on Windows with JDK 21, Android platform 35 and Google build tools 35.0.0:

```powershell
./android/build.ps1 -Jdk '<JDK directory>' -Platform '<platforms/android-35>' -BuildTools '<build-tools/35.0.0>'
```

APK is generated at `public/downloads/uangflow-dana.apk`. The test signing key stays under ignored `work/android-build`; keep it private and preserve it for compatible APK updates. This is a test distribution, not a Play Store release. APK v2/v3 signatures and SHA-256 checked during build. Native capture filter self-check:

```powershell
<JDK>/bin/javac.exe -d work/capture-test android/src/org/uangflow/dana/Capture.java android/CaptureTest.java
<JDK>/bin/java.exe -cp work/capture-test CaptureTest
```

Device keys have 256 bits of randomness, are stored as SHA-256 hashes on the server and can only validate connectivity or ingest notifications. One active key per UangFlow account; rotation invalidates the old key. No financial read permission. Pair/revoke/review requires authenticated UangFlow account and same-origin POST.

Each notification key and original timestamp produces an idempotency key. Server retains a per-account event ledger, appends confident payments atomically to current D1 JSON state, increments the existing revision and leaves uncertain formats in review. Stale browser saves return 409 instead of erasing phone events. Deleting an imported transaction does not resurrect it on retry. Clear-all deletes events and revokes pairing atomically with the financial reset.

Limits: message age 7 days; 500 queued events on Android (no overwrite); 10,000 event ledger entries/account and 10,000 financial transactions/account. Initial category Lainnya, description Pembayaran DANA. Formats must explicitly say successful payment and contain one unambiguous IDR amount. No historical import or guarantee all DANA payments emit accessible notifications. System job scheduling and vendor battery settings can delay delivery. Notification identity and real DANA text still require device calibration; synthetic tests do not establish real-world capture reliability.
