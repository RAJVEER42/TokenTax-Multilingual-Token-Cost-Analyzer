# Environment Variables Quick Reference

**TL;DR** — Copy & paste these commands to get started:

## Local Development (Docker)

```bash
# Generate SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)

# Create .env file
cat > .env << EOF
APP_ENV=development
DEBUG=true
SECRET_KEY=$SECRET_KEY
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/tokentax
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS_STR=http://localhost:5173,http://localhost:3000
VITE_API_URL=http://localhost:8000/api/v1
VITE_PROXY_TARGET=http://api:8000
EOF

# Start everything
docker compose up
```

---

## Production (AWS Example)

```bash
# Generate secrets
SECRET_KEY=$(openssl rand -hex 32)

# Export environment variables
export APP_ENV=production
export DEBUG=false
export SECRET_KEY=$SECRET_KEY
export DATABASE_URL=postgresql+asyncpg://admin:STRONG_PASSWORD@tokentax-db.abc123.us-east-1.rds.amazonaws.com:5432/tokentax
export REDIS_URL=redis://:PASSWORD@tokentax-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379/0
export CORS_ORIGINS_STR=https://yourdomain.com,https://www.yourdomain.com
export VITE_API_URL=https://api.yourdomain.com/api/v1

# Deploy
docker build -t tokentax:latest .
docker run -e APP_ENV=$APP_ENV -e SECRET_KEY=$SECRET_KEY ... tokentax:latest
```

---

## Minimal Requirements

| Variable | Value | How |
|----------|-------|-----|
| `SECRET_KEY` | 32+ byte hex | `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL URL | AWS RDS / GCP Cloud SQL endpoint |
| `REDIS_URL` | Redis URL | AWS ElastiCache / Azure / GCP |
| `VITE_API_URL` | API URL | `http://host:8000/api/v1` |

---

## Optional but Recommended

| Variable | Default | Set To |
|----------|---------|--------|
| `APP_ENV` | `development` | `production` in prod |
| `DEBUG` | `false` | `false` in prod |
| `LOG_LEVEL` | `INFO` | `WARNING` in prod |
| `CORS_ORIGINS_STR` | `localhost` | Your domain |
| `TOKENIZER_CACHE_TTL` | `86400` | Keep as-is |

---

## Cloud Provider Quick Links

- **AWS**: Secrets Manager + RDS + ElastiCache
  ```bash
  SECRET=$(aws secretsmanager get-secret-value --secret-id tokentax/secret-key --query SecretString --output text)
  ```

- **GCP**: Secret Manager + Cloud SQL + Memorystore
  ```bash
  SECRET=$(gcloud secrets versions access latest --secret="tokentax-secret")
  ```

- **Azure**: Key Vault + SQL Database + Cache for Redis
  ```bash
  SECRET=$(az keyvault secret show --vault-name tokentax --name secret-key --query value -o tsv)
  ```

---

## Common Errors

| Error | Fix |
|-------|-----|
| "SECRET_KEY is required" | Set `SECRET_KEY=$(openssl rand -hex 32)` |
| "Connection refused" on DB | Check `DATABASE_URL` host/port, ensure DB running |
| "Connection refused" on Redis | Check `REDIS_URL` host/port, ensure Redis running |
| CORS errors | Add frontend URL to `CORS_ORIGINS_STR` |
| Invalid `DATABASE_URL` format | Use `postgresql+asyncpg://user:pass@host:port/db` |

---

## Full Documentation

See **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** for complete reference with:
- All 30+ environment variables explained
- How to get each from cloud providers
- Production deployment checklist
- Troubleshooting guide

