"""Export the FastAPI OpenAPI schema to ../openapi.json.

Usage:
    python export_schema.py
"""
import json
import os
import sys

os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("CEREBRAS_API_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")

sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

schema = app.openapi()
out = os.path.join(os.path.dirname(__file__), "..", "openapi.json")
with open(out, "w") as f:
    json.dump(schema, f, indent=2)
    f.write("\n")

print(f"Schema written to {os.path.normpath(out)}")
