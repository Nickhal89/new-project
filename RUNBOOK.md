# RUNBOOK

## Workflow (Codex + Colab + User)
1. **Codex (code)**: edits code/configs and commits.
2. **Colab (execution)**: runs `python run_pipeline.py --config configs/<STEP>.yaml`.
3. **User (copy/paste only)**: copies the 5-line summary from Colab output back into chat.

## Steps
- **A1**: HAR A/B (`configs/A1.yaml`)
- **A2**: HAR + CorrShock + TailRisk A/B/C (`configs/A2.yaml`)
- **A3+**: add new config file, keep same manifest + summary contract.

## Required outputs per run
Under `runs/<RUN_ID>/`:
- `manifest.json`
- `artifacts/metrics_<VARIANT>.json`
- `artifacts/equity_curve_<VARIANT>.csv`
- `artifacts/returns_<VARIANT>.csv`
- `artifacts/summary_5_lines.txt`

## Required 5-line summary format
1. `RUN_ID: <run_id> | STATUS: PASS|FAIL`
2. `CONFIG: <config_path> | CONFIG_HASH: <sha256_12>`
3. `DATA: runs/<source_run_id>/weekly_data.csv | DATA_HASH: <sha256_12>`
4. `VARIANTS: A=<cagr>, B=<cagr>, C=<cagr or N/A>`
5. `ARTIFACTS: <artifact_count> files | COMMIT: <short_sha>`
