# Contributing to TokenTax

Thank you for your interest in contributing to TokenTax! This document provides guidelines and standards for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/TokenTax-Multilingual-Token-Cost-Analyzer.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Run all tests (see below)
6. Submit a Pull Request

## Development Setup

```bash
# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt

# Frontend
cd apps/web
npm install
```

## Code Standards

### TypeScript (Frontend)

- **Strict mode enforced**: `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `verbatimModuleSyntax`
- No file may exceed **500 lines**
- No hardcoded magic numbers — use `lib/constants.ts`
- All types centralized in `types/index.ts`
- Components must be testable in isolation
- Use `readonly` for all interface properties

### Python (Backend)

- SOLID principles throughout
- Pydantic v2 for all request/response schemas
- `structlog` for structured logging
- Services are stateless and testable without mocking infrastructure
- All floating-point outputs rounded to 6 decimal places

### General

- Conventional Commits format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- No `any` types in TypeScript
- No hardcoded secrets
- All new features must include tests

## Testing

### Backend

```bash
cd apps/api
python -m pytest tests/ -v --tb=short
python -m pytest tests/ --cov=app --cov-report=term-missing  # coverage
```

**Requirements:**
- ≥90% overall backend coverage
- ≥95% coverage for critical services (glitch_token_service)
- All tests must pass without Docker (mocked infrastructure)

### Frontend

```bash
cd apps/web
npm test                  # run all tests
npm run test:coverage     # with coverage report
```

## Adding a New Language

1. Add the language code and name to `apps/api/app/core/constants.py` → `SUPPORTED_LANGUAGES`
2. Add a golden test text to `apps/api/tests/conftest.py`
3. Add language family mapping to `apps/web/src/lib/constants.ts` → `LANGUAGE_FAMILIES`
4. Write tests verifying tokenization for the new language
5. Update the FAQ if the language has notable tokenization characteristics

## Adding a New Tokenizer Adapter

1. Create the adapter in `apps/api/app/services/tokenizers/`
2. Implement the `TokenizerAdapter` protocol (name, version, confidence, tokenize, encode_to_ids)
3. Register in the adapter registry
4. Add glitch token registry entries if applicable
5. Add pricing data to `apps/web/src/lib/constants.ts` → `TOKENIZER_PRICING`
6. Write ≥10 unit tests covering edge cases

## Pull Request Checklist

- [ ] TypeScript builds with zero errors (`tsc -b`)
- [ ] Vite build passes (`npm run build`)
- [ ] All backend tests pass (`pytest tests/`)
- [ ] All frontend tests pass (`npm test`)
- [ ] No new `any` types introduced
- [ ] No file exceeds 500 lines
- [ ] New features include tests
- [ ] Conventional Commit message format

## Reporting Issues

Use the [issue template](.github/ISSUE_TEMPLATE.md) and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/Node/Python versions
- Relevant error messages or screenshots
