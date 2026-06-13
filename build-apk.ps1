# build-apk.ps1 — Compila APK o AAB y lo copia a /dist
# Uso:
#   .\build-apk.ps1          -> APK para sideload/testing
#   .\build-apk.ps1 -AAB     -> AAB para subir a Google Play Store
#   .\build-apk.ps1 -Install -> APK + instalar en dispositivo USB
param(
  [switch]$Install,
  [switch]$AAB
)

$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$mobile  = "$root\apps\mobile"
$android = "$mobile\android"
$dist    = "$root\dist"

Write-Host "`n=== Lunara Builder ===" -ForegroundColor Cyan
if ($AAB) {
  Write-Host "    Modo: AAB (Google Play Store)" -ForegroundColor Magenta
} else {
  Write-Host "    Modo: APK (sideload / testing)" -ForegroundColor Yellow
}

# 1. Compilar
Write-Host "`n[1/3] Compilando release..." -ForegroundColor Yellow
Push-Location $android
try {
  if ($AAB) {
    & .\gradlew.bat bundleRelease --no-daemon
  } else {
    & .\gradlew.bat assembleRelease --no-daemon
  }
  if ($LASTEXITCODE -ne 0) { throw "Gradle build failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

# 2. Copiar a /dist con timestamp
$null = New-Item -ItemType Directory -Force $dist
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"

if ($AAB) {
  $src = "$android\app\build\outputs\bundle\release\app-release.aab"
  if (-not (Test-Path $src)) { throw "AAB no encontrado: $src" }
  $dst = "$dist\Lunara_$timestamp.aab"
  Copy-Item $src $dst
  $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 1)
  Write-Host "`n[2/3] AAB listo para Google Play:" -ForegroundColor Green
  Write-Host "      $dst  ($sizeMB MB)" -ForegroundColor White
  Write-Host "`n[3/3] Proximos pasos Play Store:" -ForegroundColor Cyan
  Write-Host "      1. Abre play.google.com/console" -ForegroundColor White
  Write-Host "      2. Crea nueva aplicacion -> com.shinracode.lunara" -ForegroundColor White
  Write-Host "      3. Produccion -> Crear nueva version -> Sube el AAB" -ForegroundColor White
  Write-Host "      4. URL Politica de privacidad: https://shinracode.com/privacy" -ForegroundColor White
} else {
  $src = "$android\app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $src)) { throw "APK no encontrado: $src" }
  $dst = "$dist\Lunara_$timestamp.apk"
  Copy-Item $src $dst
  $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 1)
  Write-Host "`n[2/3] APK listo:" -ForegroundColor Green
  Write-Host "      $dst  ($sizeMB MB)" -ForegroundColor White

  # Instalar en dispositivo
  $devices = & adb devices 2>$null | Select-String "device$"
  if ($devices.Count -gt 0) {
    Write-Host "`n[3/3] Dispositivo conectado — instalando y copiando APK..." -ForegroundColor Yellow
    & adb install -r $dst
    if ($LASTEXITCODE -eq 0) { Write-Host "      Instalado correctamente." -ForegroundColor Green }

    & adb push $dst /sdcard/Download/lunara-release.apk
    if ($LASTEXITCODE -eq 0) {
      Write-Host "      APK copiado a /sdcard/Download/lunara-release.apk" -ForegroundColor Green
      Write-Host "      El boton Compartir dentro de la app puede enviarlo directamente." -ForegroundColor DarkGray
    }
  } else {
    Write-Host "`n[3/3] Sin dispositivo USB conectado. APK listo para compartir." -ForegroundColor DarkGray
  }
}

Write-Host "`nHecho. Archivos en: dist\" -ForegroundColor Cyan
