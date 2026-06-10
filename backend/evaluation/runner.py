"""Run extraction against sample datasets and compare to ground truth.

Usage:
    cd backend
    python -m evaluation.runner [--dataset all|1|2|3|4] [--output results/]
"""

import json
import csv
import sys
import os
import argparse
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# allow running from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.parsers.router import parse_file
from app.extractor.engine import analyse_conversation, ConversationAnalysis
from evaluation.matcher import match_entities, MatchResult

ENTITY_TYPES = ["decisions", "reasons", "evidence", "goals", "constraints", "open_questions", "action_items"]

# map entity_type → key in ground truth JSON
GT_KEY_MAP = {
    "decisions": "decisions",
    "reasons": "reasons",
    "evidence": "evidence",
    "goals": "goals",
    "constraints": "constraints",
    "open_questions": "open_questions",
    "action_items": "action_items",
}

SAMPLE_DATA = Path(__file__).parent.parent.parent / "sample_data"


def load_ground_truth() -> Dict:
    with open(SAMPLE_DATA / "ground_truth.json") as f:
        return json.load(f)


def run_dataset(dataset_file: Path, gt_key: str, ground_truth: Dict) -> Dict[str, MatchResult]:
    print(f"\n{'='*60}")
    print(f"Dataset: {dataset_file.name}")
    print(f"{'='*60}")

    with open(dataset_file, "rb") as f:
        conversations, source_type = parse_file(dataset_file.name, f)

    print(f"  Parsed {len(conversations)} conversation(s) [{source_type}]")

    all_entities: List[Dict[str, Any]] = []
    for conv in conversations:
        analysis = analyse_conversation(conv)
        if analysis is None:
            print(f"  ✗ [{conv.title}] — all providers failed")
            continue
        print(f"\n  ✓ [{analysis.conversation_name}] via {analysis.provider_used}")
        print(f"    Pattern: {analysis.behavioral_pattern}")
        all_entities.extend(analysis.entities)

    print(f"\n  Total entities extracted: {len(all_entities)}")

    # group extracted entities by type
    extracted_by_type: Dict[str, List[str]] = {t: [] for t in ENTITY_TYPES}
    for e in all_entities:
        etype = e.get("type", "")
        # normalise open_question → open_questions, action_item → action_items
        if etype == "open_question":
            etype = "open_questions"
        elif etype == "action_item":
            etype = "action_items"
        desc = e.get("description") or e.get("title") or ""
        if desc and desc != "Unknown" and etype in extracted_by_type:
            extracted_by_type[etype].append(desc)

    gt_dataset = ground_truth.get(gt_key, {})
    results: Dict[str, MatchResult] = {}

    for etype in ENTITY_TYPES:
        gt_items = gt_dataset.get(GT_KEY_MAP[etype], [])
        ext_items = extracted_by_type.get(etype, [])
        result = match_entities(gt_items, ext_items, etype)
        results[etype] = result
        print(f"\n  [{etype}]  P={result.precision:.2f}  R={result.recall:.2f}  F1={result.f1:.2f}"
              f"  TP={len(result.true_positives)}  FP={len(result.false_positives)}  FN={len(result.false_negatives)}"
              + (f"  ambig_missed={len(result.ambiguous_missed)}" if result.ambiguous_missed else ""))

        if result.false_positives:
            print(f"    FALSE POSITIVES (hallucinations / over-extraction):")
            for fp in result.false_positives:
                print(f"      ✗ {fp[:100]}")

        if result.false_negatives:
            print(f"    FALSE NEGATIVES (missed):")
            for fn in result.false_negatives:
                print(f"      ✗ {fn[:100]}")

    return results


def aggregate(all_results: Dict[str, Dict[str, MatchResult]]) -> Dict[str, Dict]:
    summary: Dict[str, Dict] = {}
    for etype in ENTITY_TYPES:
        total_tp = total_fp = total_fn = 0
        for dataset_results in all_results.values():
            r = dataset_results.get(etype)
            if r:
                total_tp += len(r.true_positives)
                total_fp += len(r.false_positives)
                total_fn += len(r.false_negatives)
        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) else 0.0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        summary[etype] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "tp": total_tp,
            "fp": total_fp,
            "fn": total_fn,
        }
    return summary


def write_csv(all_results: Dict[str, Dict[str, MatchResult]], output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"evaluation_{ts}.csv"

    rows = []
    for dataset_name, dataset_results in all_results.items():
        for etype, result in dataset_results.items():
            for gt_text, ext_text, sim in result.true_positives:
                rows.append({
                    "dataset": dataset_name,
                    "entity_type": etype,
                    "ground_truth": gt_text,
                    "extracted": ext_text,
                    "similarity": sim,
                    "match": "Y",
                    "note": "",
                })
            for fp in result.false_positives:
                rows.append({
                    "dataset": dataset_name,
                    "entity_type": etype,
                    "ground_truth": "",
                    "extracted": fp,
                    "similarity": "",
                    "match": "FP",
                    "note": "hallucination or over-extraction",
                })
            for fn in result.false_negatives:
                rows.append({
                    "dataset": dataset_name,
                    "entity_type": etype,
                    "ground_truth": fn,
                    "extracted": "",
                    "similarity": "",
                    "match": "FN",
                    "note": "missed by engine",
                })
            for am in result.ambiguous_missed:
                rows.append({
                    "dataset": dataset_name,
                    "entity_type": etype,
                    "ground_truth": am,
                    "extracted": "",
                    "similarity": "",
                    "match": "FN_AMBIG",
                    "note": "ambiguous — low confidence expected",
                })

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["dataset", "entity_type", "ground_truth", "extracted", "similarity", "match", "note"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n  CSV written to: {path}")
    return path


DATASET_MAP = {
    "1": ("dataset1_founder_chatgpt.json", "dataset1_founder_chatgpt"),
    "2": ("dataset2_meeting_notes.md", "dataset2_meeting_notes"),
    "3": ("dataset3_founder_discussion.txt", "dataset3_founder_discussion"),
    "4": ("dataset4_postmortem.md", "dataset4_postmortem"),
}


def main():
    parser = argparse.ArgumentParser(description="Run extraction evaluation against ground truth")
    parser.add_argument("--dataset", default="all", choices=["all", "1", "2", "3", "4"],
                        help="Which dataset to evaluate (default: all)")
    parser.add_argument("--output", default="evaluation/results",
                        help="Directory for CSV output (default: evaluation/results)")
    args = parser.parse_args()

    ground_truth = load_ground_truth()
    all_results: Dict[str, Dict[str, MatchResult]] = {}

    datasets = list(DATASET_MAP.items()) if args.dataset == "all" else [(args.dataset, DATASET_MAP[args.dataset])]

    for key, (filename, gt_key) in datasets:
        filepath = SAMPLE_DATA / filename
        if not filepath.exists():
            print(f"  WARNING: {filepath} not found, skipping")
            continue
        results = run_dataset(filepath, gt_key, ground_truth)
        all_results[gt_key] = results

    summary = aggregate(all_results)

    print(f"\n{'='*60}")
    print("AGGREGATE RESULTS")
    print(f"{'='*60}")
    print(f"{'Entity type':<20} {'Precision':>10} {'Recall':>8} {'F1':>6}  TP  FP  FN")
    print("-" * 60)
    for etype, s in summary.items():
        print(f"{etype:<20} {s['precision']:>10.3f} {s['recall']:>8.3f} {s['f1']:>6.3f}  {s['tp']:>2}  {s['fp']:>2}  {s['fn']:>2}")

    output_dir = Path(args.output)
    csv_path = write_csv(all_results, output_dir)

    # write JSON summary
    summary_path = output_dir / f"summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"  JSON summary: {summary_path}")

    return summary


if __name__ == "__main__":
    main()
