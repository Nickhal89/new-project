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

### Status of previously logged code defects
- Resolved on branch head `de94fccb746f07f7eeeb38910fbc7fbdaa6b78ed`:
  - `project/run_ab.py` wrong `determine_weights` call shape
  - `project/src/allocation_engine.py` alias-only weight keys causing phantom allocations
  - `run_pipeline.py` missing chained-run `weekly_data.csv` persistence
  - `project/src/regime_engine.py` missing-value crash risk in VOI term
  - `project/src/regime_engine.py` repeated HY z-score recomputation
  - `project/src/backtest.py` Sharpe annualization mismatch
  - `project/src/risk_engine/__init__.py` hard-coded sanity threshold control

### Remaining blocker to solve next
- Revalidate the patched branch in a working local/runtime environment with real data access.
- If package or data fetches still fail, solve the local proxy/network path before interpreting any A3.1 metrics.
