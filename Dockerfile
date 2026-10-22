# syntax=docker/dockerfile:1

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.12-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/backend

# Install system dependencies (curl for healthcheck, tesseract for OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    tesseract-ocr-hin \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY pytest.ini ./

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /build/dist ./frontend/dist

# Ensure data and download directories exist
RUN mkdir -p /app/data /app/downloads

WORKDIR /app/backend

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
