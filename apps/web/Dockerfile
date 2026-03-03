# ============================================================
# TokenTax Web — Vite Dockerfile
# Platform: linux/arm64
# ============================================================

# ── Stage 1: Build ───────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────
# We use a standalone static server for production to serve the built SPA
# For development/compose we might override this with 'npm run dev'
FROM nginx:alpine

# Copy custom nginx config if we had one for client-side routing
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
