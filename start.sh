#!/usr/bin/env bash
set -e

echo "=== Decisionledger startup ==="

# ── Frontend build ─────────────────────────────────────────────────────────────
echo "[1/3] Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

# ── Backend setup ──────────────────────────────────────────────────────────────
echo "[2/3] Setting up backend..."
mkdir -p /tmp/uploads
export UPLOAD_DIR=/tmp/uploads

# ── Start server ───────────────────────────────────────────────────────────────
echo "[3/3] Starting server on port 8000..."
cd backend
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
