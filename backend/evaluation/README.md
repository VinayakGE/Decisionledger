# Extraction Evaluation Framework

Measures extraction quality against human-labelled ground truth before shipping new features.

## Why this exists

The entire product depends on one assumption:

> Conversation → Decision extraction works reliably enough that a founder would trust it.

This framework tests that assumption with real data.

## Structure

```
evaluation/
├── runner.py       # Main evaluation script
├── matcher.py      # Soft-matching engine (semantic similarity)
├── results/        # Output CSVs and JSON summaries (gitignored)
└── README.md

sample_data/
├── dataset1_founder_chatgpt.json   # ChatGPT export, pricing + hiring decisions
├── dataset2_meeting_notes.md       # Multi-speaker meeting notes
├── dataset3_founder_discussion.txt # Voice memo, stream-of-consciousness
├── dataset4_postmortem.md          # Postmortem — retrospective decisions
└── ground_truth.json               # Human-labelled entities for all 4 datasets
```

## Running

```bash
cd backend
pip install -r requirements.txt

# Evaluate all datasets
python -m evaluation.runner

# Single dataset
python -m evaluation.runner --dataset 1

# Custom output dir
python -m evaluation.runner --output /tmp/eval_results
```

Requires `ANTHROPIC_API_KEY` in `.env` — extraction calls the Anthropic API.

## Output

**Terminal:** per-dataset breakdown + aggregate table

```
[decisions]  P=0.80  R=0.75  F1=0.77  TP=6  FP=1  FN=2
  FALSE POSITIVES:
    ✗ We should consider a freemium tier  ← hallucinated
  FALSE NEGATIVES:
    ✗ Review pricing after 10 customers   ← missed
```

**CSV** (`evaluation/results/evaluation_YYYYMMDD_HHMMSS.csv`):

| dataset | entity_type | ground_truth | extracted | similarity | match | note |
|---------|-------------|--------------|-----------|------------|-------|------|
| dataset1 | decisions | Set pricing at $85/seat | Set price to $85/seat/month | 0.94 | Y | |
| dataset1 | decisions | | Consider freemium tier | | FP | hallucination |
| dataset1 | decisions | Review pricing after 10 customers | | | FN | missed |

**JSON summary** — machine-readable aggregate scores for CI integration.

## Metrics

| Metric | Formula | What it means |
|--------|---------|---------------|
| Precision | TP / (TP + FP) | Of what the engine extracted, how much is correct? |
| Recall | TP / (TP + FN) | Of what exists, how much did the engine find? |
| F1 | 2·P·R / (P+R) | Harmonic mean — penalises imbalance between P and R |

Ambiguous ground-truth items (flagged in `ground_truth.json`) are excluded from the recall denominator — it's unfair to penalise the engine for items that humans themselves disagree on.

## Matching

Extraction paraphrases are expected and correct. A match is declared when cosine similarity of sentence embeddings ≥ 0.72. Falls back to Jaccard word overlap if `sentence-transformers` is unavailable.

## Interpreting results

Based on the problem difficulty prediction:

| Entity | Expected difficulty | Target F1 |
|--------|--------------------|-----------| 
| Goals | Easy | > 0.85 |
| Constraints | Easy | > 0.85 |
| Open Questions | Easy | > 0.85 |
| Decisions | Moderate | > 0.75 |
| Action Items | Moderate | > 0.75 |
| Reasons | Hard | > 0.65 |
| Evidence | Very hard | > 0.60 |

If F1 for Decisions falls below 0.70, the extraction prompt needs redesign before building more features on top.

## The ambiguity test

`dataset3_founder_discussion.txt` contains the canonical hard case:

> *"Maybe we should delay fundraising."*

Is this a thought, a question, or a decision? The ground truth deliberately includes ambiguous items. When you run evaluation, note:

1. What does the engine classify it as?
2. What confidence score does it assign?
3. Does the confidence score actually track with ambiguity?

If the engine assigns 0.9 confidence to ambiguous items, the confidence scoring is broken.

## Adding your own data

1. Add a conversation file to `sample_data/`
2. Label it manually in `ground_truth.json` under a new key
3. Add the entry to `DATASET_MAP` in `runner.py`
4. Run `python -m evaluation.runner`

The more diverse the datasets, the more trustworthy the aggregate scores.
