# TokenTax Environment Variables — Complete Setup Guide

## 📋 Overview

This document provides **everything you need to know** about TokenTax's environment variables:
- Where to get each variable
- What it does
- How to set it locally, in Docker, and in production
- Cloud provider-specific setup (AWS, GCP, Azure)

---

## 🎯 For Different Audiences

### 👨‍💻 Local Development
→ **Start here:** [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md) + [docker-compose.yml](./docker-compose.yml)

```bash
cp .env.example .env
docker compose up
```

### 🚀 DevOps / Platform Engineering
→ **Start here:** [ENV_VARIABLES.md](./ENV_VARIABLES.md) — Cloud Provider section

Contains setup for:
- AWS (RDS, ElastiCache, Secrets Manager)
- GCP (Cloud SQL, Memorystore, Secret Manager)
- Azure (SQL Database, Cache for Redis, Key Vault)

### 🔐 Security / Compliance
→ **Start here:** [ENV_VARIABLES.md](./ENV_VARIABLES.md) — Security & Secrets section

Key points:
- All secrets from environment variables (never hardcoded)
- `SECRET_KEY` must be ≥32 bytes
- `CORS_ORIGINS_STR` never has wildcard in production
- All credentials support cloud secret managers

---

## 🗂️ File Structure

```
TokenTax/
├── .env.example              ← Copy to .env for local development
├── ENV_VARIABLES.md          ← Complete reference (30+ variables)
├── ENV_QUICK_REFERENCE.md    ← Quick cheatsheet
├── README.md                 ← Updated with env section
├── docker-compose.yml        ← Docker services with env vars
├── apps/
│   ├── api/
│   │   └── app/core/config.py  ← Settings class (source of truth)
│   └── web/
│       └── vite.config.ts       ← Frontend Vite config
└── .github/
    └── workflows/ci.yml        ← CI env setup
```

---

## ⚡ 5-Minute Setup

### Local (Docker)

```bash
# 1. Generate SECRET_KEY
openssl rand -hex 32

# 2. Create .env from example
cp .env.example .env

# 3. Edit SECRET_KEY in .env (paste the value from step 1)
# Then:

# 4. Start everything
docker compose up

# Frontend: http://localhost:5173
# API: http://localhost:8000
```

### Local (Manual)

```bash
# Backend
cd apps/api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env in apps/api/
export SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL="postgresql+asyncpg://localhost/tokentax"
export REDIS_URL="redis://localhost:6379/0"

# Run backend
uvicorn app.main:app --reload

# Frontend (new terminal)
cd apps/web
npm install
export VITE_API_URL="http://localhost:8000/api/v1"
npm run dev
```

---

## 🔑 Critical Variables (Must-Have)

These **3 variables are required** — missing any will cause the app to crash:

| Variable | Example Value | How to Get |
|----------|---------------|-----------|
| `SECRET_KEY` | `a7f3e8c...` | `openssl rand -hex 32` |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` | Create PostgreSQL DB, copy endpoint |
| `REDIS_URL` | `redis://localhost:6379/0` | Start Redis (Docker: `redis:7-alpine`) |

If any are missing, you'll see:
```
pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
SECRET_KEY
  Field required [type=missing, input_value={...}, input_type=dict]
```

---

## 📝 All Variables (30+)

| Category | Count | Required | Examples |
|----------|-------|----------|----------|
| Application | 5 | No | APP_ENV, DEBUG, LOG_LEVEL |
| API | 3 | No | API_HOST, API_PORT, API_PREFIX |
| Security | 4 | Yes (SECRET_KEY) | SECRET_KEY, JWT_* |
| Database | 6 | Yes (DATABASE_URL) | DATABASE_URL, POSTGRES_* |
| Redis | 2 | Yes (REDIS_URL) | REDIS_URL, REDIS_TTL_SECONDS |
| CORS | 1 | No | CORS_ORIGINS_STR |
| Tokenizer | 5 | No | DEFAULT_TOKENIZER, TOKENIZER_CACHE_TTL |
| Frontend | 2 | Yes (VITE_API_URL) | VITE_API_URL, VITE_PROXY_TARGET |
| **Total** | **28** | **3 critical** | |

Full details → [ENV_VARIABLES.md](./ENV_VARIABLES.md)

---

## 🌍 Cloud Provider Setup

### AWS
```bash
# Secrets
SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id tokentax/secret-key --query SecretString --output text)

# Database (RDS)
DATABASE_URL="postgresql+asyncpg://admin:PASS@tokentax-db.abc123.rds.amazonaws.com:5432/tokentax"

# Redis (ElastiCache)
REDIS_URL="redis://tokentax-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379/0"
```

### GCP
```bash
# Secrets
SECRET=$(gcloud secrets versions access latest --secret="tokentax-secret-key")

# Database (Cloud SQL)
DATABASE_URL="postgresql+asyncpg://postgres:PASS@10.0.0.2:5432/tokentax"

# Redis (Memorystore)
REDIS_URL="redis://10.0.0.3:6379/0"
```

### Azure
```bash
# Secrets
SECRET=$(az keyvault secret show --vault-name tokentax --name secret-key --query value -o tsv)

# Database (SQL Database)
DATABASE_URL="postgresql+asyncpg://admin:PASS@tokentax-db.postgres.database.azure.com:5432/tokentax"

# Redis (Cache for Redis)
REDIS_URL="redis://:KEY@tokentax.redis.cache.windows.net:6379/0"
```

Full setup instructions → [ENV_VARIABLES.md](./ENV_VARIABLES.md#cloud-provider-setup)

---

## 🐛 Troubleshooting

**Q: "SECRET_KEY is required"**
```bash
# A: Generate and set it
export SECRET_KEY=$(openssl rand -hex 32)
```

**Q: "Connection refused" on database**
```bash
# A: Check the URL
echo $DATABASE_URL
# Should be: postgresql+asyncpg://user:pass@host:5432/db

# Test connection
psql -h your-host -U your-user -d tokentax
```

**Q: "Connection refused" on Redis**
```bash
# A: Ensure Redis is running
redis-cli ping
# Should return: PONG
```

**Q: CORS errors in browser**
```bash
# A: Add your frontend URL to CORS_ORIGINS_STR
CORS_ORIGINS_STR="http://localhost:5173,https://yourdomain.com"
```

Full troubleshooting → [ENV_VARIABLES.md](./ENV_VARIABLES.md#troubleshooting)

---

## ✅ Deployment Checklist

Before deploying to production:

```bash
□ Generated new SECRET_KEY (openssl rand -hex 32)
□ Set APP_ENV=production
□ Set DEBUG=false
□ Set LOG_LEVEL=WARNING or ERROR
□ DATABASE_URL points to production database
□ REDIS_URL points to production Redis
□ CORS_ORIGINS_STR has NO wildcard *
□ All frontend URLs listed in CORS_ORIGINS_STR
□ Secrets stored in cloud secret manager (AWS/GCP/Azure)
□ Database backups enabled
□ Redis persistence enabled
□ Health endpoint responding: curl API/health/ping
□ Frontend VITE_API_URL points to production API
```

---

## 📚 Reading Order

1. **Getting started now?** → [ENV_QUICK_REFERENCE.md](./ENV_QUICK_REFERENCE.md) (5 min)
2. **Need full details?** → [ENV_VARIABLES.md](./ENV_VARIABLES.md) (15 min)
3. **Deploying to production?** → [ENV_VARIABLES.md — Production Checklist](./ENV_VARIABLES.md#production-deployment-checklist) (10 min)
4. **Using cloud providers?** → [ENV_VARIABLES.md — Cloud Provider Setup](./ENV_VARIABLES.md#environment-variable-sources-by-cloud-provider) (15 min)

---

## 🔗 Related Files

- [.env.example](./.env.example) — Copy this to `.env` locally
- [docker-compose.yml](./docker-compose.yml) — Docker Compose with env vars
- [apps/api/app/core/config.py](./apps/api/app/core/config.py) — Python Settings class (source of truth)
- [README.md](./README.md) — Project overview
- [.github/workflows/ci.yml](./.github/workflows/ci.yml) — CI environment setup

---

## 📞 Support

**Environment variable not working?**
1. Check [ENV_VARIABLES.md — Troubleshooting](./ENV_VARIABLES.md#troubleshooting)
2. Verify variable is exported: `echo $VAR_NAME`
3. Verify format matches examples in this guide
4. Check [apps/api/app/core/config.py](./apps/api/app/core/config.py) for defaults

**Need to add a new variable?**
1. Add to [apps/api/app/core/config.py](./apps/api/app/core/config.py)
2. Add to [.env.example](./.env.example)
3. Document in [ENV_VARIABLES.md](./ENV_VARIABLES.md)
4. Update relevant cloud provider sections

---

**Last Updated:** March 4, 2026 (Phase 10)  
**Version:** v1.0.0
