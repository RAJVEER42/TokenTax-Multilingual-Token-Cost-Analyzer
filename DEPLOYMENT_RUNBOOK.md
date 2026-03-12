# TokenTax — Production Deployment Runbook

> **Version:** 1.0.0  
> **Last Updated:** March 12, 2026  
> **Audience:** DevOps engineers, SREs, on-call responders

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Health Checks & Verification](#4-health-checks--verification)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Scaling Guidelines](#7-scaling-guidelines)
8. [Incident Response](#8-incident-response)
9. [Maintenance Windows](#9-maintenance-windows)
10. [Security Checklist](#10-security-checklist)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Production Docker Compose](#12-production-docker-compose)
13. [DNS & SSL Configuration](#13-dns--ssl-configuration)
14. [Database Backup & Restore](#14-database-backup--restore)

---

## 1. Architecture Overview

```
                    ┌─────────────┐
                    │   CDN/LB    │
                    │ (Nginx/ALB) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────┴──────┐          ┌──────┴──────┐
       │   Web SPA   │          │  FastAPI    │
       │ (Nginx/S3)  │          │  (Uvicorn)  │
       │  Port 80    │          │  Port 8000  │
       └─────────────┘          └──────┬──────┘
                                       │
                          ┌────────────┼────────────┐
                          │                         │
                   ┌──────┴──────┐          ┌──────┴──────┐
                   │ PostgreSQL  │          │    Redis    │
                   │  Port 5432  │          │  Port 6379  │
                   └─────────────┘          └─────────────┘
```

**Components:**

| Service | Technology | Container | Port |
|---------|-----------|-----------|------|
| API | FastAPI + Uvicorn | `tokentax-api` | 8000 |
| Web | React 19 SPA (Nginx) | `tokentax-web` | 80/443 |
| Database | PostgreSQL 15 | `tokentax-db` | 5432 |
| Cache | Redis 7 | `tokentax-redis` | 6379 |
| Metrics | Prometheus | `tokentax-prometheus` | 9090 |
| Dashboards | Grafana | `tokentax-grafana` | 3001 |

---

## 2. Pre-Deployment Checklist

### 2.1 Environment Variables

```bash
# Verify ALL required env vars are set
[ -z "$SECRET_KEY" ]     && echo "❌ SECRET_KEY missing"     || echo "✅ SECRET_KEY"
[ -z "$DATABASE_URL" ]   && echo "❌ DATABASE_URL missing"   || echo "✅ DATABASE_URL"
[ -z "$REDIS_URL" ]      && echo "❌ REDIS_URL missing"      || echo "✅ REDIS_URL"
[ -z "$CORS_ORIGINS_STR" ] && echo "❌ CORS_ORIGINS missing" || echo "✅ CORS_ORIGINS"
```

**Critical variables:**

| Variable | Example | Notes |
|----------|---------|-------|
| `SECRET_KEY` | `openssl rand -hex 32` | **32+ bytes**, never commit |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/tokentax` | Use RDS/Cloud SQL |
| `REDIS_URL` | `redis://:pass@host:6379/0` | Use ElastiCache/Memorystore |
| `APP_ENV` | `production` | Enables JSON logs, Sentry |
| `SENTRY_DSN` | `https://xxx@sentry.io/yyy` | Optional — error tracking |
| `CORS_ORIGINS_STR` | `https://yourdomain.com` | Comma-separated |

### 2.2 Database Migration

```bash
# Run Alembic migrations before deploying new code
cd apps/api
alembic upgrade head

# Verify migration status
alembic current
alembic history --verbose
```

### 2.3 Tests

```bash
# Backend (must pass 362+ tests, ≥90% coverage)
cd apps/api && python -m pytest tests/ --cov=app --tb=short -q

# Frontend (must pass 266+ tests, 0 TS errors)
cd apps/web && npx tsc -b --noEmit && npx vitest run

# Vite build (must produce clean dist/)
cd apps/web && npx vite build
```

### 2.4 Docker Images

```bash
# Build production images
docker build -t tokentax-api:v1.0.0 ./apps/api
docker build -t tokentax-web:v1.0.0 ./apps/web

# Tag for registry
docker tag tokentax-api:v1.0.0 your-registry/tokentax-api:v1.0.0
docker tag tokentax-web:v1.0.0 your-registry/tokentax-web:v1.0.0

# Push
docker push your-registry/tokentax-api:v1.0.0
docker push your-registry/tokentax-web:v1.0.0
```

---

## 3. Deployment Procedures

### 3.1 Docker Compose (Single Server)

```bash
# Pull latest images
docker compose pull

# Deploy with zero downtime
docker compose up -d --build --remove-orphans

# Verify all services are healthy
docker compose ps
docker compose logs -f --tail=50 api
```

### 3.2 Rolling Deployment (Kubernetes)

```bash
# Update image tag in deployment manifest
kubectl set image deployment/tokentax-api api=your-registry/tokentax-api:v1.0.0
kubectl set image deployment/tokentax-web web=your-registry/tokentax-web:v1.0.0

# Watch rollout progress
kubectl rollout status deployment/tokentax-api --timeout=300s
kubectl rollout status deployment/tokentax-web --timeout=300s
```

### 3.3 Blue-Green Deployment

```bash
# 1. Deploy GREEN environment
docker compose -f docker-compose.green.yml up -d

# 2. Verify GREEN health
curl -f https://green.yourdomain.com/api/v1/health/ping

# 3. Switch traffic (update LB target)
# AWS: aws elbv2 modify-listener ...
# Nginx: update upstream block

# 4. Drain BLUE after 5 minutes
sleep 300 && docker compose -f docker-compose.blue.yml down
```

---

## 4. Health Checks & Verification

### 4.1 Immediate Checks (< 1 minute)

```bash
# Liveness — returns immediately (no DB/Redis)
curl -s http://localhost:8000/api/v1/health/ping
# Expected: {"status":"ok","message":"pong"}

# Readiness — checks DB + Redis
curl -s http://localhost:8000/api/v1/health
# Expected: {"status":"healthy","services":{"database":{"status":"healthy"},"redis":{"status":"healthy"}}}

# API Docs accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs
# Expected: 200

# Frontend loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
# Expected: 200
```

### 4.2 Functional Smoke Tests (< 5 minutes)

```bash
# Analyze endpoint
curl -s -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","language":"en"}' | jq '.results | length'
# Expected: 4 (one per tokenizer)

# Tokenizers metadata
curl -s http://localhost:8000/api/v1/tokenizers | jq '.count'
# Expected: 4

# Languages metadata
curl -s http://localhost:8000/api/v1/languages | jq '.count'
# Expected: ≥16

# Prometheus metrics
curl -s http://localhost:8000/api/v1/metrics | head -5
# Expected: Prometheus exposition format text
```

### 4.3 Auth Endpoints (< 2 minutes)

```bash
# Register
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepass123"}' | jq '.access_token'

# Login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepass123"}' | jq '.token_type'
# Expected: "bearer"
```

---

## 5. Monitoring & Alerting

### 5.1 Prometheus Metrics

**Endpoint:** `GET /api/v1/metrics`

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method/path/status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_requests_in_progress` | Gauge | Currently processing requests |

### 5.2 Key Dashboards (Grafana)

| Dashboard | URL | What to watch |
|-----------|-----|---------------|
| API Overview | `/d/api-overview` | Request rate, error rate, latency p50/p95/p99 |
| Database | `/d/postgres` | Connection pool, query latency, dead tuples |
| Redis | `/d/redis` | Hit rate, memory usage, evictions |
| Auth | `/d/auth` | Login rate, registration rate, token refresh rate |

### 5.3 Alert Rules

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | >5% 5xx in 5min | Critical | Page on-call |
| High Latency | p95 > 2s for 5min | Warning | Investigate |
| DB Connection Exhaustion | pool > 80% | Critical | Scale or fix leaks |
| Redis Memory | > 80% max | Warning | Review TTLs |
| Disk Space | > 85% | Warning | Clean logs / expand |
| Health Check Failing | 3 consecutive | Critical | Auto-restart + page |

### 5.4 Sentry Error Tracking

```bash
# Enable by setting SENTRY_DSN
export SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/project-id

# Sentry auto-captures:
# - Unhandled exceptions in FastAPI routes
# - SQLAlchemy query errors
# - Performance traces (20% sampling in prod, 100% in staging)
```

### 5.5 Structured Logging

Production logs are JSON-formatted for aggregation:

```json
{
  "event": "analyze.complete",
  "level": "info",
  "timestamp": "2026-03-04T12:00:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "result_count": 4,
  "error_count": 0
}
```

**Log aggregation options:**
- AWS CloudWatch Logs → CloudWatch Insights
- Datadog Agent → Datadog Log Explorer
- Fluentd/Fluent Bit → Elasticsearch → Kibana

---

## 6. Rollback Procedures

### 6.1 Immediate Rollback (< 2 minutes)

```bash
# Docker Compose
docker compose down
docker compose -f docker-compose.yml up -d --no-build
# Uses previously cached images

# Kubernetes
kubectl rollout undo deployment/tokentax-api
kubectl rollout undo deployment/tokentax-web
kubectl rollout status deployment/tokentax-api
```

### 6.2 Database Rollback

```bash
# Check current migration
alembic current

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>
```

### 6.3 Feature Flag Rollback

If using feature flags, disable the problematic feature without redeployment:

```bash
# Redis-based feature flag
redis-cli SET feature:auth:enabled false
```

---

## 7. Scaling Guidelines

### 7.1 Horizontal Scaling

| Component | Min | Recommended | Max | Bottleneck |
|-----------|-----|-------------|-----|------------|
| API (Uvicorn) | 2 workers | 4 workers | 8 workers | CPU-bound tokenization |
| Web (Nginx) | 1 | 2 | N/A | Static files, minimal |
| PostgreSQL | 1 primary | 1 primary + 1 read replica | 1+3 | Write-heavy on share |
| Redis | 1 | 1 (clustered for HA) | 3 | Memory-bound cache |

### 7.2 Vertical Scaling Recommendations

| Service | Min Resources | Recommended |
|---------|--------------|-------------|
| API | 512MB RAM, 1 vCPU | 2GB RAM, 2 vCPU |
| PostgreSQL | 1GB RAM | 4GB RAM, SSD storage |
| Redis | 256MB RAM | 1GB RAM |
| Web | 128MB RAM | 256MB RAM |

### 7.3 Performance Benchmarks

| Endpoint | p50 | p95 | p99 | Throughput |
|----------|-----|-----|-----|------------|
| `GET /health/ping` | <5ms | <10ms | <20ms | 10k+ rps |
| `POST /analyze` (short) | <100ms | <250ms | <500ms | 200+ rps |
| `POST /analyze` (long) | <500ms | <1s | <2s | 50+ rps |
| `GET /tokenizers` | <10ms | <20ms | <50ms | 5k+ rps |

---

## 8. Incident Response

### 8.1 Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| SEV-1 | Complete outage | 15 min | API unreachable, DB down |
| SEV-2 | Major degradation | 30 min | High error rate, auth broken |
| SEV-3 | Minor issue | 2 hours | Single tokenizer failing |
| SEV-4 | Cosmetic | Next sprint | UI rendering issue |

### 8.2 Runbook: API Unreachable

```bash
# 1. Check container status
docker compose ps

# 2. Check API logs
docker compose logs --tail=100 api

# 3. Verify DB connectivity
docker compose exec api python -c "
import asyncio
from app.db.session import engine
async def check():
    async with engine.connect() as conn:
        await conn.execute(__import__('sqlalchemy').text('SELECT 1'))
        print('DB OK')
asyncio.run(check())
"

# 4. Verify Redis
docker compose exec redis redis-cli ping

# 5. Restart API
docker compose restart api

# 6. If persists, check resource usage
docker stats --no-stream
```

### 8.3 Runbook: High Memory Usage

```bash
# 1. Check container memory
docker stats --no-stream

# 2. Check Redis memory
docker compose exec redis redis-cli INFO memory | grep used_memory_human

# 3. Flush Redis cache if needed (non-destructive — cache rebuilds)
docker compose exec redis redis-cli FLUSHDB

# 4. Check PostgreSQL connections
docker compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 9. Maintenance Windows

### 9.1 Database Maintenance (Monthly)

```bash
# Vacuum and analyze (run during low traffic)
docker compose exec db psql -U postgres -d tokentax -c "VACUUM ANALYZE;"

# Reindex (if needed)
docker compose exec db psql -U postgres -d tokentax -c "REINDEX DATABASE tokentax;"
```

### 9.2 Log Rotation

```bash
# Docker handles log rotation via daemon.json:
# {
#   "log-driver": "json-file",
#   "log-opts": {
#     "max-size": "50m",
#     "max-file": "5"
#   }
# }
```

### 9.3 SSL Certificate Renewal

```bash
# Let's Encrypt auto-renewal (certbot)
certbot renew --quiet
nginx -t && nginx -s reload
```

---

## 10. Security Checklist

- [ ] `SECRET_KEY` is 32+ bytes, randomly generated, not committed
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `REDIS_URL` uses authentication (`:password@host`)
- [ ] `CORS_ORIGINS_STR` lists only your domains (no `*`)
- [ ] `APP_ENV=production` (enables JSON logs, disables debug)
- [ ] `DEBUG=false` in production
- [ ] Docker containers run as non-root user
- [ ] Healthcheck endpoint does not expose internal details
- [ ] No source code patterns matching `sk-`, `AKIA`, or raw credentials
- [ ] Input validation: text ≤50,000 chars, language in allowlist
- [ ] Rate limiting configured at LB level
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Security headers set (CSP, HSTS, X-Frame-Options)

---

## 11. CI/CD Pipeline

### 11.1 Pipeline Overview

The deployment pipeline (`.github/workflows/deploy.yml`) runs automatically on:
- **Push to `main`** — full test → build → deploy → smoke test
- **Version tags** (`v*.*.*`) — tagged release deploy
- **Manual dispatch** — hotfix deploys to staging or production

**Stages:**

```
test_backend → test_frontend → build_images → deploy_production → smoke_tests → notify_failure
     │              │               │                │                 │              │
   362+ tests    266+ tests     GHCR push      SSH deploy         7-point        Slack alert
   ≥90% cov     0 TS errors    multi-arch     rolling restart    validation      on failure
```

### 11.2 Image Registry

Images are pushed to GitHub Container Registry (GHCR):
- `ghcr.io/<owner>/tokentax-api:<tag>`
- `ghcr.io/<owner>/tokentax-web:<tag>`

Tags follow semver + SHA: `v1.0.0`, `sha-abc1234`, `latest`

### 11.3 Deployment Strategy

1. Pull latest compose file via `git pull`
2. Pull new Docker images from GHCR
3. Run Alembic database migrations
4. Rolling restart: API first, then Web (no simultaneous restart)
5. Wait for health checks (API: 30 attempts × 5s, Web: 15 attempts × 3s)
6. Prune old images

### 11.4 Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP/hostname |
| `DEPLOY_USER` | SSH user on production server |
| `DEPLOY_SSH_KEY` | SSH private key for deployment |
| `PRODUCTION_URL` | Base URL for smoke tests (e.g., `https://tokentax.io`) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for failure alerts (optional) |

---

## 12. Production Docker Compose

### 12.1 Usage

```bash
# Copy and configure environment
cp .env.production.example .env.production

# Edit with real values
nano .env.production

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f api
```

### 12.2 Services

| Service | Image | Ports | Resources |
|---------|-------|-------|-----------|
| `api` | Custom (Gunicorn+Uvicorn) | 8000 | 2GB/2CPU |
| `web` | Custom (Nginx+SPA) | 80 | 256MB/0.5CPU |
| `db` | postgres:15-alpine | 5432 | 2GB/2CPU |
| `redis` | redis:7-alpine | 6379 | 768MB/1CPU |
| `prometheus` | prom/prometheus:v2.51.0 | 9090 | 1GB/1CPU |
| `grafana` | grafana/grafana:10.4.0 | 3001 | 512MB/1CPU |
| `db-backup` | postgres:15-alpine | — | 256MB/0.25CPU |

### 12.3 Volumes

| Volume | Purpose | Backup |
|--------|---------|--------|
| `postgres_data` | PostgreSQL data | Daily automated |
| `postgres_backups` | pg_dump files (7-day retention) | Copy to off-site |
| `redis_data` | Redis AOF + RDB persistence | Rebuilt from source |
| `prometheus_data` | TSDB (30d retention, 5GB limit) | Not critical |
| `grafana_data` | Dashboards, user prefs | Provisioned from code |

---

## 13. DNS & SSL Configuration

### 13.1 DNS Setup

```
# A Records
tokentax.io          → <server-ip>
www.tokentax.io      → <server-ip>

# Optional subdomains
api.tokentax.io      → <server-ip>   (if API on separate subdomain)
grafana.tokentax.io  → <server-ip>   (monitoring dashboard)
```

### 13.2 Let's Encrypt SSL (Certbot)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d tokentax.io -d www.tokentax.io

# Verify auto-renewal
sudo certbot renew --dry-run

# Cron job (auto-configured by certbot)
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 13.3 Nginx SSL Termination

For production, add an outer Nginx reverse proxy on the host:

```nginx
server {
    listen 443 ssl http2;
    server_name tokentax.io www.tokentax.io;

    ssl_certificate     /etc/letsencrypt/live/tokentax.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tokentax.io/privkey.pem;

    # HSTS (2 years, includeSubDomains)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Proxy to Docker web container
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name tokentax.io www.tokentax.io;
    return 301 https://$host$request_uri;
}
```

### 13.4 CDN (Cloudflare)

For edge caching of static assets:

1. **DNS**: Point nameservers to Cloudflare
2. **SSL Mode**: Full (strict) — Cloudflare ↔ origin uses Let's Encrypt cert
3. **Page Rules**:
   - `tokentax.io/assets/*` → Cache Level: Cache Everything, Edge TTL: 1 month
   - `tokentax.io/api/*` → Cache Level: Bypass (dynamic content)
4. **Cache Invalidation**: Purge `assets/*` after each frontend deploy

---

## 14. Database Backup & Restore

### 14.1 Automated Backups

The `db-backup` sidecar container runs daily `pg_dump` with 7-day retention:

```bash
# View backup files
docker compose -f docker-compose.prod.yml exec db-backup ls -la /backups/

# Manual backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -Fc -U tokentax tokentax > backup_$(date +%Y%m%d).dump
```

### 14.2 Restore from Backup

```bash
# Stop API to prevent writes
docker compose -f docker-compose.prod.yml stop api

# Restore from dump file
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U tokentax -d tokentax --clean --if-exists < /backups/tokentax_20260312_030000.dump

# Restart API
docker compose -f docker-compose.prod.yml start api

# Verify
docker compose -f docker-compose.prod.yml exec db \
  psql -U tokentax -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### 14.3 Off-Site Backup

```bash
# Copy backups to S3 (add to cron)
aws s3 sync /var/lib/docker/volumes/tokentax_postgres_backups/_data/ \
  s3://tokentax-backups/postgres/ --storage-class STANDARD_IA

# Or rsync to a backup server
rsync -avz /var/lib/docker/volumes/tokentax_postgres_backups/_data/ \
  backup-server:/backups/tokentax/postgres/
```

---

## Quick Reference

```bash
# ── Development ──────────────────────────────────
docker compose up -d
docker compose logs -f api

# ── Production ───────────────────────────────────
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

# ── Migrations ───────────────────────────────────
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -f docker-compose.prod.yml exec api alembic current

# ── Health Checks ────────────────────────────────
curl http://localhost:8000/api/v1/health/ping
curl http://localhost:8000/api/v1/metrics

# ── Smoke Tests ──────────────────────────────────
./infra/scripts/smoke-test.sh http://localhost
./infra/scripts/smoke-test.sh https://tokentax.io

# ── Rollback ─────────────────────────────────────
docker compose -f docker-compose.prod.yml pull api web   # pull previous tag
docker compose -f docker-compose.prod.yml up -d api web
alembic downgrade -1                                      # if migration rollback needed

# ── Restart ──────────────────────────────────────
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d
```

---

*Document maintained by the TokenTax DevOps team.*  
*Last reviewed: March 12, 2026 — v1.0.0*
