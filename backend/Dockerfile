# ──────────────────────────────────────────────
#  Backend Flask — Hospital Ciberlab CTF
# ──────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema (solo lo necesario)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python (incluye gunicorn para producción)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copiar código fuente
COPY . .

# Crear directorio de datos y sembrar la base de datos
RUN mkdir -p app/data && python seed_database.py

EXPOSE 5000

# Gunicorn en producción (4 workers, timeout generoso para el hardware OT)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "run:app"]
