# Environment Variables Guide

Complete reference for all TokenTax environment variables: where to get them, what they do, and how to configure them.

## Quick Start

### Development (Local)

```bash
# Copy the example file
cp .env.example .env

# For local development with Docker Compose, use:
docker-compose up
```

### Production

```bash
# Set these critical variables before deploying
export SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL="postgresql://user:pass@prod-db-host:5432/tokentax"
export REDIS_URL="redis://:password@prod-redis-host:6379/0"
export APP_ENV="production"
export CORS_ORIGINS_STR="https://yourdomain.com,https://www.yourdomain.com"
```

---

## Backend Environment Variables

### Application Configuration

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `APP_ENV` | `development` | No | Environment mode: `development`, `staging`, `production` | Manual: set based on deployment target |
| `APP_NAME` | `TokenTax` | No | Application display name | Manual: keep as `TokenTax` |
| `APP_VERSION` | `0.1.0` | No | Semantic version (read from code, overridable) | Manual or CI: matches git tag |
| `DEBUG` | `false` | No | Enable verbose logging and debug mode | Manual: `true` in dev, `false` in prod |
| `LOG_LEVEL` | `INFO` | No | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` | Manual: `DEBUG` in dev, `WARNING` in prod |

**Example:**
```bash
APP_ENV=production
APP_VERSION=0.9.0
DEBUG=false
LOG_LEVEL=WARNING
```

---

### API Configuration

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `API_HOST` | `0.0.0.0` | No | Host to bind API server to | Manual: keep as `0.0.0.0` for Docker |
| `API_PORT` | `8000` | No | Port for API server | Manual: `8000` locally, can be changed in prod |
| `API_PREFIX` | `/api/v1` | No | URL prefix for all API routes | Manual: keep as `/api/v1` |

**Example:**
```bash
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api/v1
```

---

### Security & Secrets

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `SECRET_KEY` | ❌ None | **YES** | HS256 JWT signing key (32+ bytes hex) | Generate: `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` | No | JWT signing algorithm | Manual: keep as `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | No | Access token lifetime | Manual: `30` min is standard |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | No | Refresh token lifetime | Manual: `7` days is standard |

**How to Generate SECRET_KEY:**

```bash
# On macOS/Linux
openssl rand -hex 32
# Output: a7f3e8c9d2b1a4f6e8c0d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b

# Store it securely:
export SECRET_KEY="a7f3e8c9d2b1a4f6e8c0d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b"
```

**⚠️ CRITICAL:**
- Never commit `SECRET_KEY` to version control
- Use different keys for dev/staging/prod
- In AWS: use Secrets Manager
- In GCP: use Secret Manager
- In Azure: use Key Vault

**Example:**
```bash
SECRET_KEY=a7f3e8c9d2b1a4f6e8c0d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

### Database (PostgreSQL)

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `DATABASE_URL` | ❌ None | **YES** | Full connection string | Format: `postgresql+asyncpg://user:password@host:port/dbname` |
| `POSTGRES_HOST` | `postgres` | No | Database hostname | Docker: `postgres`, Cloud: RDS/CloudSQL endpoint |
| `POSTGRES_PORT` | `5432` | No | Database port | Default: `5432` |
| `POSTGRES_DB` | `tokentax` | No | Database name | Keep as `tokentax` |
| `POSTGRES_USER` | `tokentax` | No | Database user | Create user in PostgreSQL |
| `POSTGRES_PASSWORD` | `tokentax_dev_password` | No | Database password | Generate strong password in prod |

**DATABASE_URL Format:**
```
postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
```

**Examples:**

*Local Development:*
```bash
DATABASE_URL=postgresql+asyncpg://tokentax:tokentax_dev_password@localhost:5432/tokentax
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tokentax
POSTGRES_USER=tokentax
POSTGRES_PASSWORD=tokentax_dev_password
```

*Docker Compose:*
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/tokentax
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=tokentax
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

*AWS RDS:*
```bash
DATABASE_URL=postgresql+asyncpg://admin:StrongPassword123@tokentax-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/tokentax
POSTGRES_HOST=tokentax-db.c9akciq32.us-east-1.rds.amazonaws.com
POSTGRES_USER=admin
POSTGRES_PASSWORD=StrongPassword123
```

*GCP Cloud SQL:*
```bash
DATABASE_URL=postgresql+asyncpg://postgres:SecurePass456@35.x.x.x:5432/tokentax
POSTGRES_HOST=35.x.x.x
POSTGRES_USER=postgres
```

**How to Create PostgreSQL User:**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create user and database
CREATE USER tokentax WITH PASSWORD 'tokentax_dev_password';
CREATE DATABASE tokentax OWNER tokentax;
GRANT ALL PRIVILEGES ON DATABASE tokentax TO tokentax;
```

---

### Redis (Caching)

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `REDIS_URL` | ❌ None | **YES** | Full Redis connection string | Format: `redis://:password@host:port/db` |
| `REDIS_TTL_SECONDS` | `3600` | No | Cache expiry time (1 hour) | Adjust based on freshness requirements |

**REDIS_URL Format:**
```
redis://:PASSWORD@HOST:PORT/DB_NUMBER
```

**Examples:**

*Local Development (No Auth):*
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_TTL_SECONDS=3600
```

*Docker Compose:*
```bash
REDIS_URL=redis://redis:6379/0
REDIS_TTL_SECONDS=3600
```

*AWS ElastiCache (With Auth):*
```bash
REDIS_URL=redis://:MyRedisPassword@tokentax-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379/0
REDIS_TTL_SECONDS=3600
```

*Azure Cache for Redis:*
```bash
REDIS_URL=redis://:DefaultKey123AbcDef456GhiJkl@tokentax.redis.cache.windows.net:6379/0
REDIS_TTL_SECONDS=3600
```

*GCP Memorystore:*
```bash
REDIS_URL=redis://10.0.0.2:6379/0
REDIS_TTL_SECONDS=3600
```

**How to Set Up Redis Locally:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or with Homebrew (macOS)
brew install redis
redis-server
```

---

### CORS (Cross-Origin Requests)

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `CORS_ORIGINS_STR` | `http://localhost:3000` | No | Comma-separated list of allowed origins | Manual: list all frontend URLs |

**CORS_ORIGINS_STR Format:**
```
http://origin1.com,http://origin2.com,https://origin3.com
```

**Examples:**

*Local Development:*
```bash
CORS_ORIGINS_STR=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
```

*Staging:*
```bash
CORS_ORIGINS_STR=https://staging.yourdomain.com,https://staging-app.yourdomain.com
```

*Production:*
```bash
CORS_ORIGINS_STR=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

**⚠️ Security Notes:**
- Never use wildcard `*` in production
- Each origin must be exact (scheme + domain + port)
- Separate multiple origins with commas (no spaces)

---

### Tokenizer Configuration

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `DEFAULT_TOKENIZER` | `tiktoken` | No | Default tokenizer if none specified | Keep as `tiktoken` |
| `TOKENIZER_CACHE_TTL` | `86400` | No | Token cache lifetime (24 hours) | Adjust based on language stability |
| `TOKENIZERS_PARALLELISM` | `false` | No | Enable parallel tokenizer loading | Set `true` for faster startup (uses more RAM) |
| `BATCH_MAX_SIZE` | `1000` | No | Maximum batch analysis size | Increase for more parallel processing |
| `WORKER_CONCURRENCY` | `4` | No | Number of worker threads | Match CPU cores: `cpu_count()` |

**Example:**
```bash
DEFAULT_TOKENIZER=tiktoken
TOKENIZER_CACHE_TTL=86400
TOKENIZERS_PARALLELISM=false
BATCH_MAX_SIZE=1000
WORKER_CONCURRENCY=4
```

---

### Pricing & Data

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `PRICING_SNAPSHOT_DIR` | `data/pricing_snapshots` | No | Path to pricing data directory | Manual: keep as `data/pricing_snapshots` |

**Example:**
```bash
PRICING_SNAPSHOT_DIR=data/pricing_snapshots
```

---

## Frontend Environment Variables

### Vite Build Configuration

| Variable | Default | Required | Purpose | How to Set |
|----------|---------|----------|---------|-----------|
| `VITE_API_URL` | N/A | **YES** | Backend API base URL | Format: `http://host:port/api/v1` |
| `VITE_PROXY_TARGET` | N/A | No | Proxy target for dev server | Docker: `http://api:8000` |

**Examples:**

*Local Development:*
```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_PROXY_TARGET=http://localhost:8000
```

*Docker Compose:*
```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_PROXY_TARGET=http://api:8000
```

*Production:*
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
```

---

## Docker Compose Quick Reference

Complete `.env` file for local development with Docker Compose:

```bash
# ── Application ──────────────────────────────────────────
APP_ENV=development
APP_NAME=TokenTax
APP_VERSION=0.9.0
DEBUG=true
LOG_LEVEL=INFO

# ── Security ──────────────────────────────────────────────
# Generate with: openssl rand -hex 32
SECRET_KEY=dev-only-change-in-production-32-byte-hex

# ── API ───────────────────────────────────────────────────
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api/v1

# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/tokentax
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=tokentax
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0
REDIS_TTL_SECONDS=3600

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS_STR=http://localhost:5173,http://localhost:3000

# ── Tokenizer ─────────────────────────────────────────────
DEFAULT_TOKENIZER=tiktoken
TOKENIZER_CACHE_TTL=86400
TOKENIZERS_PARALLELISM=false
BATCH_MAX_SIZE=1000
WORKER_CONCURRENCY=4

# ── Frontend ──────────────────────────────────────────────
VITE_API_URL=http://localhost:8000/api/v1
VITE_PROXY_TARGET=http://api:8000
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Generate new `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Set `APP_ENV=production`
- [ ] Set `DEBUG=false`
- [ ] Set `LOG_LEVEL=WARNING` or `ERROR`
- [ ] Configure production `DATABASE_URL` (AWS RDS, GCP Cloud SQL, etc.)
- [ ] Configure production `REDIS_URL` (AWS ElastiCache, Azure, GCP, etc.)
- [ ] Set `CORS_ORIGINS_STR` to production domain(s) only
- [ ] Ensure no wildcard `*` in CORS origins
- [ ] Verify `VITE_API_URL` points to production API
- [ ] Store secrets in: AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault
- [ ] Enable HTTPS/TLS for all connections
- [ ] Configure database backups
- [ ] Set up Redis persistence

### Monitoring

```bash
# Health endpoint (no auth required)
curl http://api:8000/api/v1/health/ping

# Response:
# {"status": "healthy", "message": "API is running"}
```

---

## Troubleshooting

### "SECRET_KEY is required"
**Problem:** Missing `SECRET_KEY` environment variable
**Solution:** Generate with `openssl rand -hex 32` and set `SECRET_KEY` env var

### "Connection refused" on database
**Problem:** `DATABASE_URL` host/port incorrect or DB not running
**Solution:** 
```bash
# Test PostgreSQL connection
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
```

### "Connection refused" on Redis
**Problem:** `REDIS_URL` host/port incorrect or Redis not running
**Solution:**
```bash
# Test Redis connection
redis-cli -h redis ping
# Should return: PONG
```

### CORS errors in browser
**Problem:** Frontend origin not in `CORS_ORIGINS_STR`
**Solution:** Add frontend URL to `CORS_ORIGINS_STR` and restart API

### "SQLAlchemy InvalidRequestError"
**Problem:** `DATABASE_URL` format incorrect
**Solution:** Verify format is `postgresql+asyncpg://user:pass@host:port/db`

---

## Environment Variable Sources by Cloud Provider

### AWS

```bash
# Secrets Manager
SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id tokentax/secret-key --query SecretString --output text)

# RDS Endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier tokentax-db --query 'DBInstances[0].Endpoint.Address' --output text)
DATABASE_URL="postgresql+asyncpg://admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/tokentax"

# ElastiCache Endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id tokentax-cache --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Address' --output text)
REDIS_URL="redis://${REDIS_ENDPOINT}:6379/0"
```

### GCP

```bash
# Secret Manager
export SECRET_KEY=$(gcloud secrets versions access latest --secret="tokentax-secret-key")

# Cloud SQL Private IP
export DATABASE_URL="postgresql+asyncpg://postgres:${DB_PASSWORD}@10.0.0.2:5432/tokentax"

# Memorystore Endpoint
export REDIS_URL="redis://10.0.0.3:6379/0"
```

### Azure

```bash
# Key Vault
export SECRET_KEY=$(az keyvault secret show --vault-name tokentax --name secret-key --query value -o tsv)

# SQL Server
export DATABASE_URL="postgresql+asyncpg://admin:${DB_PASSWORD}@tokentax-db.postgres.database.azure.com:5432/tokentax"

# Cache for Redis
export REDIS_URL="redis://:${REDIS_KEY}@tokentax.redis.cache.windows.net:6379/0"
```

---

## Summary Table

| Category | Variable | Required | How to Get |
|----------|----------|----------|-----------|
| **App** | `APP_ENV` | No | Manual: dev/staging/prod |
| **App** | `APP_VERSION` | No | From git tag or manual |
| **API** | `API_HOST` | No | Use `0.0.0.0` |
| **API** | `API_PORT` | No | Use `8000` |
| **Security** | `SECRET_KEY` | **YES** | `openssl rand -hex 32` |
| **Database** | `DATABASE_URL` | **YES** | RDS/CloudSQL/Managed DB endpoint |
| **Database** | `POSTGRES_*` | No | Derived from DATABASE_URL |
| **Redis** | `REDIS_URL` | **YES** | ElastiCache/Azure/GCP endpoint |
| **CORS** | `CORS_ORIGINS_STR` | No | Your frontend URLs |
| **Frontend** | `VITE_API_URL` | **YES** | Backend API URL |
| **Tokenizer** | `TOKENIZER_CACHE_TTL` | No | Use `86400` (24 hours) |

