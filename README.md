# TokenTax — Multilingual Token Cost Analyzer

> **Production-grade research system for measuring token inequality, BPE bias, and economic API cost disparities across languages.**

[![CI](https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## 🎯 Project Vision

Modern LLMs tokenize text using Byte-Pair Encoding (BPE), which was predominantly trained on English corpora. This creates a **hidden tax** on non-English speakers:

- A sentence in Hindi may cost **3–5× more tokens** than the same semantic content in English
- Users pay more, get less context window, and experience degraded performance
- This is a **measurable, quantifiable bias** — TokenTax makes it visible

TokenTax is a research-grade system that:
- Measures token counts per language per model
- Calculates a **fairness score** (token efficiency relative to English baseline)
- Computes **economic cost disparity** using live pricing snapshots
- Tags all outputs with **EXACT or ESTIMATED** confidence labels
- Maintains **immutable pricing snapshots** for reproducibility

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TokenTax Platform                      │
├──────────────┬──────────────────┬───────────────────────┤
│   React 18   │   FastAPI (async)│   PostgreSQL 15       │
│  TypeScript  │   Python 3.11+   │   Redis 7             │
│  TailwindCSS │   SQLAlchemy 2   │   Alembic migrations  │
│  Zustand     │   Pydantic v2    │   Async workers       │
│  Recharts    │   tiktoken       │                       │
└──────────────┴──────────────────┴───────────────────────┘
```

### Core Components

| Component | Purpose |
|-----------|---------|
| `apps/api` | FastAPI backend — analysis engine, REST API |
| `apps/web` | React frontend — dashboard, visualizations |
| `workers/` | Async batch processing workers |
| `libs/domain` | Pure business logic (no framework coupling) |
| `libs/adapters` | Tokenizer adapters (tiktoken, sentencepiece) |
| `libs/metrics` | Fairness score + cost disparity calculations |
| `libs/schemas` | Shared Pydantic schemas |
| `infra/` | Docker, CI/CD, deployment configs |

---

## 🚀 Local Setup

### Prerequisites

- Docker Desktop 4.x+ (Apple Silicon: enable Rosetta for x86 images)
- Python 3.11+
- Node.js 20+
- Git

### 1. Clone & Configure

```bash
git clone https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer.git
cd TokenTax-Multilingual-Token-Cost-Analyzer
cp .env.example .env
```

### 2. Start with Docker (Recommended)

```bash
docker compose up --build
```

Services will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:8000/health

### 3. Manual Setup (Development)

**Backend:**
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

---

## 🐳 Docker Instructions

```bash
# Start all services
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f api

# Stop all
docker compose down

# Full reset (removes volumes)
docker compose down -v
```

---

## 🔬 Determinism Principles

TokenTax enforces strict determinism:

1. **Tokenizer Version Pinning** — Every analysis records the exact tokenizer version used
2. **Immutable Snapshots** — Pricing data is stored as append-only versioned snapshots
3. **Unicode Normalization** — All text is NFC-normalized before tokenization
4. **Reproducible Results** — Given the same input + snapshot version, output is always identical
5. **No Floating Point Drift** — Cost calculations use Python `Decimal` for precision

---

## 🏷️ Confidence Labeling

Every analysis result is tagged:

| Label | Meaning |
|-------|---------|
| `EXACT` | Token count from official tokenizer, pricing from verified snapshot |
| `ESTIMATED` | Tokenizer approximation or pricing extrapolated from older snapshot |

---

## 📐 Versioning Philosophy

- **API versions** follow `v1`, `v2` path prefixes — never breaking changes within a version
- **Pricing snapshots** are append-only with `effective_date` — historical analyses remain valid
- **Formula versions** are stored with each analysis record — algorithm changes don't corrupt history
- **Tokenizer versions** are pinned per analysis — `tiktoken==0.6.0` is stored alongside results

---

## 🤝 Contribution Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Ensure all checks pass: `pre-commit run --all-files`
4. Write tests for new functionality
5. Submit a PR with a clear description

### Code Standards
- Python: Black + isort + mypy strict
- TypeScript: ESLint + strict mode
- Commits: Conventional Commits format

---

## 🗺️ Roadmap

### Phase 1 (Current) — Foundation
- [x] Monorepo structure
- [x] FastAPI + PostgreSQL + Redis
- [x] Docker Compose
- [x] CI/CD pipeline
- [x] Health endpoints

### Phase 2 — Core Engine
- [ ] Tokenizer adapters (tiktoken, sentencepiece)
- [ ] Fairness score formula
- [ ] Cost disparity calculator
- [ ] Pricing snapshot system

### Phase 3 — Analysis API
- [ ] Single text analysis endpoint
- [ ] Batch analysis endpoint
- [ ] Async workers
- [ ] Redis caching (>80% hit rate target)

### Phase 4 — Frontend Dashboard
- [ ] Language comparison charts
- [ ] Cost disparity visualization
- [ ] Real-time analysis UI
- [ ] Batch job tracking

### Phase 5 — Auth & Multi-tenancy
- [ ] JWT authentication
- [ ] API key management
- [ ] Usage tracking
- [ ] Rate limiting

### Phase 6 — Production
- [ ] Kubernetes configs
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Performance benchmarks
- [ ] Research paper export

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

*Built with engineering discipline. Designed to scale. Intended for research.*
