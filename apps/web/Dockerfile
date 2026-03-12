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

# NOTE: In production, use Dockerfile.prod which copies infra/nginx.conf
# with SPA routing, gzip, security headers, and API proxy.
# The dev Dockerfile uses default nginx config (sufficient for local dev).

# Copy static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
