# TokenTax — Multilingual Token Cost Analyzer

> **Research-grade system for measuring token inequality, BPE bias, and economic API cost disparities across languages.**

[![CI](https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## 🎯 Vision

Modern LLMs tokenize text using Byte-Pair Encoding (BPE), predominantly trained on English corpora. This creates a **hidden tax** on non-English speakers:

- A sentence in Tamil may cost **3–5× more tokens** than the same semantic content in English
- Users pay more, get less context window, and experience degraded performance
- This is a **measurable, quantifiable bias** — TokenTax makes it visible

TokenTax measures, visualizes, and educates about this disparity with an interactive learning platform.

---

## 🏗️ Architecture

```
TokenTax (monorepo)
├── apps/
│   ├── api/            FastAPI backend (Python 3.11+)
│   │   ├── services/   Tokenization, fairness, glitch detection, caching
│   │   ├── schemas/    Pydantic request/response models
│   │   ├── models/     SQLAlchemy ORM (SharedAnalysis)
│   │   └── api/v1/     REST endpoints (analyze, share, health, metadata)
│   └── web/            React 19 + TypeScript 5.9 frontend
│       ├── pages/      Dashboard, Analyze, Learn, Research, FAQ, Glitch Tokens, Share
│       ├── components/ Visualizations, interactive demos, share cards
│       └── lib/        Constants, transforms, tutorial data, FAQ data
├── docs/               Technical documentation (glitch tokens, etc.)
├── infra/              Docker, CI/CD configuration
└── docker-compose.yml
```

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI · PostgreSQL 15 · Redis 7 · SQLAlchemy 2 · Pydantic v2 |
| Tokenizers | tiktoken · SentencePiece · HuggingFace · Claude (heuristic) |
| Frontend | React 19 · TypeScript 5.9 · TailwindCSS v4 · Recharts 3 · Framer Motion |
| State | Zustand 5 (client) · React Query (server) |
| Testing | pytest (≥90% backend) · Vitest (frontend) |
| Build | Vite 7 · Docker Compose |

---

## 🚀 Run Locally

### Prerequisites

- Docker Desktop 4.x+
- Python 3.11+
- Node.js 20+

### Quick Start (Docker)

```bash
git clone https://github.com/RAJVEER42/TokenTax-Multilingual-Token-Cost-Analyzer.git
cd TokenTax-Multilingual-Token-Cost-Analyzer
cp .env.example .env
docker compose up --build
```

**Environment Variables:**

All environment variables are in `.env.example`. Key required variables:

- `SECRET_KEY` — Generate with `openssl rand -hex 32`
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `VITE_API_URL` — Frontend-facing API URL

For detailed documentation, see **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** — covers all variables, where to get them, cloud provider setup (AWS/GCP/Azure), and troubleshooting.

### Manual Development Setup

```bash
# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd apps/web
npm install && npm run dev
```

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/v1/health/ping

---

## 📐 Fairness Methodology

TokenTax computes a **fairness score** per tokenizer:

```
token_ratio    = (tokens_language / tokens_english) × 100
fairness_score = clamp(100 − (token_ratio − 100), 0, 100)
```

- **100** = perfect parity with English
- **0** = extreme disparity (≥2× more tokens)

All results embed a `formula_version` for reproducibility. See the [Research page](http://localhost:5173/research) for full methodology, statistical approach, and citations.

---

## ✨ Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Dashboard** | `/dashboard` | System status, tokenizer health, quick stats |
| **Analyzer** | `/analyze` | Multi-tokenizer analysis with fairness scores & visualizations |
| **Interactive Tutorial** | `/learn` | 3-minute guided walkthrough with interactive demos |
| **Research** | `/research` | Peer-review style methodology with formulas & citations |
| **FAQ** | `/faq` | 10+ evidence-based answers with expandable accordion |
| **Glitch Tokens** | `/glitch-tokens` | Deep dive into tokenizer vocabulary artifacts |
| **Shareable Results** | `/share/:id` | Persistent links with PNG export & OG metadata |
| **Pricing** | `/pricing` | Immutable, versioned pricing snapshots |

### Supported Languages (16)

English · Spanish · French · German · Chinese · Japanese · Korean · Arabic · Hindi · Russian · Portuguese · Turkish · Vietnamese · Thai · Swahili · Bengali

---

## 🔬 Determinism & Reproducibility

1. **Formula Versioning** — Every result embeds `formula_version` (semver)
2. **Tokenizer Pinning** — Exact library versions recorded per analysis
3. **NFC Normalization** — All text normalized before tokenization
4. **Immutable Pricing** — Date-versioned snapshots, never modified
5. **6-decimal Rounding** — Platform-independent JSON serialization

---

## 🧪 Testing

```bash
# Backend (362+ tests, ≥90% coverage)
cd apps/api && python -m pytest tests/ -v --cov=app

# Frontend (266+ tests)
cd apps/web && npm test
```

---

## 🔐 Authentication

TokenTax v1.0.0 includes full JWT authentication:

- **Register** — `POST /api/v1/auth/register`
- **Login** — `POST /api/v1/auth/login`
- **Token Refresh** — `POST /api/v1/auth/refresh`
- **Profile** — `GET /api/v1/auth/me` (Bearer token required)

---

## 📊 Monitoring & Observability

| Feature | Technology | Endpoint |
|---------|-----------|----------|
| Prometheus Metrics | `prometheus-client` | `GET /api/v1/metrics` |
| Request Tracing | `X-Request-ID` header | Auto-injected |
| Error Tracking | Sentry SDK | Optional (`SENTRY_DSN`) |
| Structured Logging | structlog (JSON) | `stdout` |
| Dashboards | Grafana | `http://localhost:3001` |

See **[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)** for production deployment guide, incident response procedures, and scaling guidelines.

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on adding languages, tokenizer adapters, and improving fairness formulas.

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

*Academically grounded. Statistically rigorous. Built to educate.*
