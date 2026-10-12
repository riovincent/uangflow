param(
  [Parameter(Mandatory=$true)][string]$Jdk,
  [Parameter(Mandatory=$true)][string]$Platform,
  [Parameter(Mandatory=$true)][string]$BuildTools
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskBuild=Join-Path $taskRoot 'work/android-build'
New-Item -ItemType Directory -Force -Path $taskBuild,(Join-Path $taskBuild 'classes'),(Join-Path $taskBuild 'dex'),(Join-Path $taskRoot 'public/downloads') | Out-Null
function Check {if($LASTEXITCODE -ne 0){throw "Build tool failed ($LASTEXITCODE)"}}
$taskJar=Join-Path $Platform 'android.jar'
& (Join-Path $BuildTools 'aapt2.exe') compile --dir (Join-Path $PSScriptRoot 'res') -o (Join-Path $taskBuild 'resources.zip'); Check
& (Join-Path $BuildTools 'aapt2.exe') link -I $taskJar --manifest (Join-Path $PSScriptRoot 'AndroidManifest.xml') --min-sdk-version 26 --target-sdk-version 35 -o (Join-Path $taskBuild 'unsigned.apk') (Join-Path $taskBuild 'resources.zip'); Check
$taskSources=Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName
& (Join-Path $Jdk 'bin/javac.exe') -encoding UTF-8 -source 8 -target 8 -classpath $taskJar -d (Join-Path $taskBuild 'classes') $taskSources; Check
& (Join-Path $Jdk 'bin/jar.exe') cf (Join-Path $taskBuild 'classes.jar') -C (Join-Path $taskBuild 'classes') .; Check
& (Join-Path $Jdk 'bin/java.exe') -cp (Join-Path $BuildTools 'lib/d8.jar') com.android.tools.r8.D8 --lib $taskJar --min-api 26 --output (Join-Path $taskBuild 'dex') (Join-Path $taskBuild 'classes.jar'); Check
& (Join-Path $Jdk 'bin/jar.exe') uf (Join-Path $taskBuild 'unsigned.apk') -C (Join-Path $taskBuild 'dex') classes.dex; Check
& (Join-Path $BuildTools 'zipalign.exe') -f 4 (Join-Path $taskBuild 'unsigned.apk') (Join-Path $taskBuild 'aligned.apk'); Check
# shortcut: local test signing key; use a protected release key before Play Store distribution.
$taskKey=Join-Path $taskBuild 'test-signing.p12'
if(!(Test-Path -LiteralPath $taskKey)){
  & (Join-Path $Jdk 'bin/keytool.exe') -genkeypair -keystore $taskKey -storepass android -keypass android -alias uangflow-test -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=UangFlow Test'; Check
}
$taskApk=Join-Path $taskRoot 'public/downloads/uangflow-dana.apk'
& (Join-Path $Jdk 'bin/java.exe') -jar (Join-Path $BuildTools 'lib/apksigner.jar') sign --ks $taskKey --ks-pass pass:android --out $taskApk (Join-Path $taskBuild 'aligned.apk'); Check
& (Join-Path $Jdk 'bin/java.exe') -jar (Join-Path $BuildTools 'lib/apksigner.jar') verify --verbose $taskApk; Check
(Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLower() | Set-Content -LiteralPath (Join-Path $taskRoot 'public/downloads/uangflow-dana.apk.sha256')
Write-Output ('APK: '+$taskApk)
