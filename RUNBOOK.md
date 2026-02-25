# RUNBOOK

## Collaboration contract
1. Codex edits code + configs and commits.
2. Colab executes: `python run_pipeline.py --config <config-file>`.
3. User only copy/pastes the printed 5-line summary.

## Steps
- A2 overlays: `configs/A2_overlays.yaml`
- A3 multi-asset: `configs/A3_multiactive.yaml`

## Hard rules
- Real data only.
- Fail hard if prerequisites are missing.
- Every run writes `runs/<RUN_ID>/manifest.json`.
- Every run prints the standard 5-line summary.

## Standard 5-line output
1. `RUN_ID: <...>`
2. `COMMIT: <git hash or NA>`
3. `DATA_HASH: <sha256>`
4. `STATUS: PASS/FAIL`
5. `TOPLINE: Variant=<best>, CAGR=..., Sharpe=..., MaxDD=..., Vol=..., ES95=..., Turnover=...`
