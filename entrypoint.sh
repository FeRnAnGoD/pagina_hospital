#!/bin/sh
set -e

echo "========================================================"
echo "  HOSPITAL CLINICO METROPOLITANO CIBERLAB - CTF 2026"
echo "  Iniciando servicios unificados (Nginx + Flask/Gunicorn)"
echo "========================================================"

# Asegurar existencia del directorio de datos de la DB
mkdir -p /app/backend/app/data

# Si no existe la base de datos o está vacía, sembrar con seed_database.py
if [ ! -f /app/backend/app/data/hospital.sqlite ]; then
    echo "[HOSPITAL INIT] Sembrando base de datos inicial con 150 pacientes..."
    cd /app/backend && python seed_database.py
    echo "[HOSPITAL INIT] Base de datos creada exitosamente."
else
    echo "[HOSPITAL INIT] Base de datos persistente detectada."
fi

# Arrancar Gunicorn en segundo plano (1 worker para mantener estado de memoria unificado)
echo "[HOSPITAL INIT] Arrancando backend Gunicorn (1 worker en 127.0.0.1:5000)..."
cd /app/backend
gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 --timeout 120 run:app &

# Arrancar Nginx en primer plano (sirve React y proxia /api a Gunicorn)
echo "[HOSPITAL INIT] Arrancando Nginx (Escuchando en puerto 80)..."
exec nginx -g "daemon off;"
