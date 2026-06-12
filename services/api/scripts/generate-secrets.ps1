# Genera JWT secrets seguros de 64 caracteres hex para Railway
# Uso: .\scripts\generate-secrets.ps1

$accessSecret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
$refreshSecret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

Write-Host ""
Write-Host "=== Variables para Railway ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_ACCESS_SECRET=$accessSecret" -ForegroundColor Green
Write-Host "JWT_REFRESH_SECRET=$refreshSecret" -ForegroundColor Green
Write-Host ""
Write-Host "Copia estas variables en:" -ForegroundColor Yellow
Write-Host "  Railway → tu proyecto → Variables" -ForegroundColor Yellow
Write-Host ""
Write-Host "Variables adicionales requeridas:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL=postgresql://... (Railway PostgreSQL plugin)" -ForegroundColor White
Write-Host "  REDIS_URL=redis://...         (Railway Redis plugin)" -ForegroundColor White
Write-Host ""
Write-Host "Variables opcionales (AI - agrega cuando tengas la API key):" -ForegroundColor Yellow
Write-Host "  AI_SERVICE_URL=              (deja vacío por ahora)" -ForegroundColor White
