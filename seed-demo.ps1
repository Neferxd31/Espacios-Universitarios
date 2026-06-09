# ============================================================================
# Hard reset + seed coherente para demo (PowerShell).
# ============================================================================

$ErrorActionPreference = 'Stop'

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESET + SEED DEMO — Espacios Universitarios UFPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "▶ 1/5 Users..." -ForegroundColor Yellow
docker compose exec -T users python manage.py seed_demo
Write-Host ""

Write-Host "▶ 2/5 Spaces..." -ForegroundColor Yellow
docker compose exec -T spaces python manage.py seed_demo
Write-Host ""

Write-Host "▶ 3/5 Reservations..." -ForegroundColor Yellow
docker compose exec -T reservations python manage.py seed_demo
Write-Host ""

Write-Host "▶ 4/5 Notifications..." -ForegroundColor Yellow
docker compose exec -T notifications python manage.py seed_demo
Write-Host ""

Write-Host "▶ 5/5 Reports..." -ForegroundColor Yellow
docker compose exec -T reports python manage.py seed_demo
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ DEMO LISTA" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:3000"
Write-Host "  RabbitMQ UI: http://localhost:15672 (guest/guest)"
Write-Host ""
Write-Host "  Credenciales:" -ForegroundColor Cyan
Write-Host "    • 1152307  / 12345678A   (Nefer — Estudiante)"
Write-Host "    • admin001 / admin1234   (Admin)"
Write-Host ""
