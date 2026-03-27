# Failure Log

## 2026-03-27
### Blocker: Local Codex shell unavailable in current session
- Exact error: `CreateProcessWithLogonW failed: 1326`
- Impact: Could not inspect or update local desktop handoff files, local repo files, or execute validation commands from this session.
- Alternatives attempted:
  - `shell_command` with PowerShell defaults
  - `shell_command` with `login: false`
  - trivial commands without repo context
  - Playwright `file:///` access to local markdown files
  - MCP resource discovery for filesystem-like access
- Result: all local-access paths unavailable in this session.

### Blocker: Project environment cannot fetch dependencies and market data
- Observed in existing project logs on branch `codex/build-quantitative-research-environment`.
- Exact recurring error family:
  - `Tunnel connection failed: 403 Forbidden`
  - `ProxyError('Cannot connect to proxy.', OSError('Tunnel connection failed: 403 Forbidden'))`
- Impact:
  - package installation fails
  - Yahoo/Stooq/FRED data fetches fail
  - real-data gate fails before meaningful A3.1 acceptance testing

### Code-level issues already flagged on PR #2
- P0: `project/run_ab.py` calls `determine_weights` with the wrong argument list, which can abort every A/B run before backtest execution.
- P1: `project/src/allocation_engine.py` renames weight keys in ways that do not match backtest asset keys, causing phantom allocations.
- P1: `run_pipeline.py` expects chained-run `weekly_data.csv` artifacts in `runs/<id>/`, but the pipeline does not persist them there.
- P1: `project/src/regime_engine.py` can crash on missing `US_EQ` values in the VOI extension term.
- P2: `project/src/backtest.py` reports Sharpe inconsistently versus annualized volatility.
- P2: `project/src/regime_engine.py` recomputes HY z-scores inside the main loop, creating avoidable runtime cost.
- P2: `project/src/risk_engine/__init__.py` hard-codes sanity thresholds that can override config intent.
