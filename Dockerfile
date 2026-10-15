# ─────────────────────────────────────────────────────────────
#  CONTENEDOR UNIFICADO: HOSPITAL CLINICO CIBERLAB CTF 2026
#  - Etapa 1: Build de React con Node 20
#  - Etapa 2: Python 3.11 + Nginx + Gunicorn (1 worker estable)
# ─────────────────────────────────────────────────────────────

# --- ETAPA 1: Construcción de Frontend React ---
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# --- ETAPA 2: Imagen Final Unificada (Python + Nginx) ---
FROM python:3.11-slim

WORKDIR /app

# Instalar Nginx y dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python (Flask, Bcrypt, Gunicorn, requests, etc.)
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt gunicorn

# Copiar el código del Backend
COPY backend /app/backend

# Copiar el build compilado del Frontend a la carpeta de Nginx
COPY --from=frontend-builder /build/dist /var/www/html

# Copiar la configuración de Nginx (servir React + reverse proxy local a Flask)
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copiar script de arranque
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
