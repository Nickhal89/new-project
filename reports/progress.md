# Progress Log

## 2026-03-27
- Identified the active Alpha Factory continuation point as PR #2 on branch `codex/build-quantitative-research-environment` in `Nickhal89/new-project`.
- Confirmed the branch already contains the quantitative research scaffold, configs for A1/A2/A3.1, end-to-end runner, dependency installer, and data-quality logging.
- Confirmed the last known execution state was blocked by environment/network access, not by strategy iteration alone.
- Observed repeated proxy/network failures when fetching market data and Python packages, producing `Tunnel connection failed: 403 Forbidden` in logged runs.
- Captured the highest-signal next work items from PR review findings and branch logs into `reports/resume_state.md` and `reports/failure.md`.
- No local validation was possible from the current Codex session because local shell execution is broken with `CreateProcessWithLogonW failed: 1326`.
- Landed a code-fix checkpoint on branch head `de94fccb746f07f7eeeb38910fbc7fbdaa6b78ed` to address the known pipeline defects that did not require local runtime access.
- Fixed `project/run_ab.py` to call `determine_weights` with the full required inputs and consistent proxy returns.
- Fixed `project/src/allocation_engine.py` so produced weights stay keyed to backtest asset names instead of alias-only names.
- Fixed `project/src/regime_engine.py` to precompute HY z-scores once and to tolerate missing `US_EQ` values in the VOI extension term.
- Fixed `run_pipeline.py` to persist `weekly_data.csv` into each run directory and to apply sanity thresholds from config stats rather than hard-coded gate booleans.
- Fixed `project/src/backtest.py` Sharpe annualization to align with annualized volatility.
- Relaxed `project/src/risk_engine/__init__.py` sanity helper so config-level thresholding remains the source of truth.
- Added config-runner compatibility for legacy `transaction_cost` configs so bundled A1/A2 files no longer abort on `KeyError: 'tx_cost_bps'`.
- Corrected `configs/A2.yaml` overlay field names to match the allocator schema used by `har_corr_tail` runs.
- Added regression coverage for the `transaction_cost` alias path and for the corrected A2 overlay schema.
- Hardened `project/src/backtest.py` so alias-named sleeves (`BONDS`, `HY`, `COMMS`) are recognized alongside legacy names (`AGG_BOND`, `HY_PROXY`, `COMMOD`).
- Added regression coverage for alias-named backtest assets to prevent phantom zero-return sleeves from reappearing through alternate data column naming.
- Advanced the canonical remote checkpoint to `fe9a0979439848372f7aaa8f27b9ea08e09ac63c` before this pass.

## Stable checkpoint
- Best available canonical checkpoint is the remote PR #2 branch head because the current local session still cannot inspect the local repo.
- Quant scaffold exists and the highest-signal review defects have been patched in code.
- Remaining blockers are environment validation and real-data execution, not the previously logged code defects.
