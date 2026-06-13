# dev-usb.ps1 — Desarrollo con recarga automatica por USB (sin WiFi)
# Uso: .\dev-usb.ps1
# Requiere: dispositivo con depuracion USB habilitada y cable conectado

$ErrorActionPreference = "Stop"
$mobile = "$PSScriptRoot\apps\mobile"

Write-Host "`n=== Lunara Dev (USB) ===" -ForegroundColor Cyan

# Verificar dispositivo
$devices = & adb devices 2>$null | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "ERROR: No hay dispositivo USB conectado." -ForegroundColor Red
    Write-Host "  1. Conecta el telefono por USB" -ForegroundColor Yellow
    Write-Host "  2. Habilita Depuracion USB en Opciones de desarrollador" -ForegroundColor Yellow
    exit 1
}

Write-Host "Dispositivo detectado: $($devices[0])" -ForegroundColor Green

# Abrir puerto Metro por USB (evita necesitar WiFi)
Write-Host "`nAbriendo tunel USB (puerto 8081)..." -ForegroundColor Yellow
& adb reverse tcp:8081 tcp:8081
& adb reverse tcp:8082 tcp:8082  # Expo DevTools
if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: adb reverse fallo. Intenta igual." -ForegroundColor Yellow
}

Write-Host "Tunel USB listo. Metro se conectara por cable." -ForegroundColor Green
Write-Host "`nIniciando Metro..." -ForegroundColor Yellow
Write-Host "(Cada vez que guardes un archivo, la app se recargara sola)" -ForegroundColor DarkGray
Write-Host ""

# Iniciar Metro solo en localhost (usa el tunel USB, no WiFi)
Push-Location $mobile
try {
    & npx expo start --localhost --android
} finally {
    Pop-Location
}
