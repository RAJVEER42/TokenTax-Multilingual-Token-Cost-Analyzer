# ============================================================
# TokenTax API — Multi-stage Dockerfile
# Platform: linux/arm64 (Apple Silicon M3 Pro)
# ============================================================

# ── Stage 1: Builder ─────────────────────────────────────
# Install dependencies in a separate stage to minimize final image size
FROM python:3.11-slim AS builder

WORKDIR /build

# Install system deps needed to compile Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching optimization)
COPY requirements.txt requirements-dev.txt ./

# Install into a dedicated prefix for clean copying
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ─────────────────────────────────────
FROM python:3.11-slim AS runtime

# Security: run as non-root user
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Install only runtime system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ping || exit 1

# Start server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
