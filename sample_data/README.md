# Sample Data

Four datasets for evaluating extraction quality. Each file is a realistic conversation
representing a different real-world source.

| File | Type | What it tests |
|------|------|---------------|
| `dataset1_founder_chatgpt.json` | ChatGPT export | Decisions buried in exploration; ambiguous phrasing |
| `dataset2_meeting_notes.md` | Markdown | Multi-speaker notes; implicit decisions |
| `dataset3_founder_discussion.txt` | Plain text | Stream-of-consciousness; thoughts vs decisions |
| `dataset4_postmortem.md` | Markdown | Post-hoc rationalization; clear evidence |

## Ground truth

`ground_truth.json` — human-labelled entities for all four datasets.
Used by `backend/evaluation/` to compute precision, recall, and inter-rater agreement.
