# ──────────────────────────────────────────────
#  Frontend React — Hospital Ciberlab CTF
#  Multistage: build con Node → serve con Nginx
# ──────────────────────────────────────────────

# ── Etapa 1: build ──
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ── Etapa 2: servidor Nginx ──
FROM nginx:1.27-alpine

# Copiar el build de React al directorio público de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
