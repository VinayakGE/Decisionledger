FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the SentenceTransformer model at build time so the first
# /insights request doesn't stall on a cold start. The || true allows
# offline/air-gapped builds to succeed; the model will be fetched at runtime
# instead, with the _model_load_failed sentinel handling any failure gracefully.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" \
    || echo "WARNING: SentenceTransformer model could not be pre-downloaded (no network?). It will be fetched at runtime."

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
