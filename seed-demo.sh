#!/usr/bin/env bash
# ============================================================================
# Hard reset + seed coherente para demo.
# Corre los 5 seed_demo de cada microservicio en el orden correcto.
# ============================================================================

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  RESET + SEED DEMO — Espacios Universitarios UFPS"
echo "═══════════════════════════════════════════════════════════════"
echo

echo "▶ 1/5 Users..."
docker compose exec -T users python manage.py seed_demo
echo

echo "▶ 2/5 Spaces..."
docker compose exec -T spaces python manage.py seed_demo
echo

echo "▶ 3/5 Reservations..."
docker compose exec -T reservations python manage.py seed_demo
echo

echo "▶ 4/5 Notifications..."
docker compose exec -T notifications python manage.py seed_demo
echo

echo "▶ 5/5 Reports..."
docker compose exec -T reports python manage.py seed_demo
echo

echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ DEMO LISTA"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "  Frontend:    http://localhost:3000"
echo "  RabbitMQ UI: http://localhost:15672 (guest/guest)"
echo
echo "  Credenciales:"
echo "    • 1152307  / 12345678A   (Nefer — Estudiante)"
echo "    • admin001 / admin1234   (Admin)"
echo
