# Resume State

## Project
- Workstream: Alpha Factory quantitative research environment
- Repository: `Nickhal89/new-project`
- Active branch: `codex/build-quantitative-research-environment`
- Reference PR: #2
- Last stable commit: `9d9af6393430867446a11108ff431b7501e20da3`
- Active profile: build_mode

## Current status
- The branch contains the main scaffold for the quant pipeline and associated configs.
- The current state is not ready for acceptance because real-data execution is blocked and several review findings remain unresolved.
- Synthetic fallback execution existed earlier, but `RUNBOOK.md` states that acceptance requires real data only.

## Next exact action
1. Fix the P0/P1 code issues already identified on PR #2 before any further performance interpretation:
   - correct `determine_weights` call shape in `project/run_ab.py`
   - align allocation weight keys with backtest asset names in `project/src/allocation_engine.py`
   - persist `weekly_data.csv` into each `runs/<RUN_ID>/` output directory for chained runs
   - harden `project/src/regime_engine.py` against missing `US_EQ` values
2. Re-run the pipeline in an environment with working Python package access and outbound market-data access.
3. Validate `configs/A3_multiactive.yaml` against the acceptance targets in `RUNBOOK.md` using real data.
4. If A3.1 misses targets, iterate on config and regime/allocation logic only after the run artifacts are real-data clean.

## Assumptions to verify when local access is restored
- Confirm this repo is the same project referenced by the desktop handoff files.
- Confirm whether any local-only changes exist outside GitHub PR #2.
- Confirm whether a local proxy/VPN setting is the root cause of package/data fetch failures.

## Validation status
- Local validation from the current session: not possible
- Reason: shell execution failure `CreateProcessWithLogonW failed: 1326`
- Last known project validation: synthetic fallback run only; real-data gate failed
