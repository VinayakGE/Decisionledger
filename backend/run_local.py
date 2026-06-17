"""Run local heuristic extraction on an uploaded conversations.json file.
Usage: python3 run_local.py <path_to_conversations.json>
"""
import sys, json, os
os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("CEREBRAS_API_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")

sys.path.insert(0, os.path.dirname(__file__))

from app.parsers import claude_export
from app.extractor.providers.heuristic_provider import HeuristicProvider

path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/chat_upload/conversations.json"

with open(path, "rb") as f:
    conversations = claude_export.parse(f)

provider = HeuristicProvider()
results = []

print(f"\nProcessing {len(conversations)} conversations (local heuristic engine)...\n")
print("=" * 70)

for conv in conversations:
    result = provider.extract(conv)
    import json as _json
    parsed = _json.loads(result["raw"])
    entities = parsed.get("entities", [])

    by_type = {}
    for e in entities:
        by_type.setdefault(e["type"], []).append(e)

    print(f"\nConversation: {conv.title}")
    print(f"  Date      : {conv.created_at.date() if conv.created_at else 'unknown'}")
    print(f"  Entities  : {len(entities)} found")
    for etype, items in by_type.items():
        print(f"\n  [{etype.upper()}]")
        for item in items:
            print(f"    • {item['description'][:120]}")

    results.append({
        "title": conv.title,
        "date": str(conv.created_at.date()) if conv.created_at else None,
        "behavioral_pattern": parsed.get("behavioral_pattern", ""),
        "entity_count": len(entities),
        "entities": entities,
    })

# Write output
out_path = "/tmp/chat_upload/extraction_results.json"
with open(out_path, "w") as f:
    json.dump(results, f, indent=2)

print("\n" + "=" * 70)
print(f"\nDone. {sum(r['entity_count'] for r in results)} total entities across {len(results)} conversations.")
print(f"Full results written to: {out_path}")

# Summary table
print("\nSUMMARY")
print(f"{'Conversation':<50} {'Entities':>8}")
print("-" * 60)
for r in sorted(results, key=lambda x: -x["entity_count"]):
    print(f"{r['title'][:49]:<50} {r['entity_count']:>8}")
