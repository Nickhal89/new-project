from pathlib import Path

import subprocess
import sys

from src.allocation_engine import determine_weights
from src.backtest import run_backtest
from src.data_loader import fetch_all_weekly
from src.diagnostics import data_quality_report, write_quality_reports
from src.indicators import compute_indicators
from src.regime_engine import compute_regime_indices
from src.utils import configure_logging, ensure_dirs, write_csv, write_json

BASE = Path(__file__).resolve().parent


def write_methodology(path: Path, report: dict):
    txt = [
        '# Methodology v1',
        '- Scoring indices: TRI, VSI, CRI, LMI, VOI mapped to 0-100 and combined into GRS.',
        '- Portfolio is long-only, no leverage, no shorting.',
        '- Risk controls: regime risk budgets, vol targets, concentration caps, corr governor, drawdown throttle, convex sleeve caps.',
        '- Execution cadence: weekly signal computation, monthly rebalance, t-1 signal for week t.',
        '- Data sources used per series are listed in the Data Quality Report.',
        f"- Source mapping snapshot: {report.get('sources', {})}",
    ]
    path.write_text('\n'.join(txt), encoding='utf-8')



def attempt_dependency_install(logger):
    script = BASE / 'install_deps.py'
    if not script.exists():
        logger.warning('Dependency installer missing; skipping install step.')
        return
    try:
        proc = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=25)
        logger.info('Dependency installer stdout: %s', proc.stdout.strip())
        if proc.returncode != 0:
            logger.warning('Dependency installer failed: %s', proc.stderr.strip())
    except subprocess.TimeoutExpired:
        logger.warning('Dependency installer timed out; continuing.')


def main():
    ensure_dirs(BASE)
    logger = configure_logging(BASE / 'logs' / 'run.log')

    attempt_dependency_install(logger)
    panel, meta, failures = fetch_all_weekly('1995-01-01')
    dqr = data_quality_report(panel, meta, failures)
    write_quality_reports(dqr, BASE / 'logs' / 'data_quality_report.json', BASE / 'logs' / 'data_quality_report.md')

    if dqr['status'] != 'PASS':
        msg = 'DATA QUALITY GATE FAILED. Missing/invalid core series. ' \
              f"Reasons: {dqr['gate_fail_reasons']}. Attempts: {dqr.get('attempts', {})}"
        logger.error(msg)
        raise RuntimeError(msg)

    indicators, rets, corr_avg, corr_z = compute_indicators(panel)
    regimes = compute_regime_indices(panel, indicators, rets, corr_avg, corr_z)

    dummy_dd = [0.0] * len(panel['Date'])
    weights = determine_weights(panel['Date'], regimes, dummy_dd)
    bt = run_backtest(panel, weights)
    weights = determine_weights(panel['Date'], regimes, bt['drawdowns'])
    bt = run_backtest(panel, weights)

    write_csv(BASE / 'data' / 'weekly_data.csv', list(panel.keys()), zip(*[panel[k] for k in panel.keys()]))

    score_headers = ['Date', 'TRI', 'VSI', 'CRI', 'LMI', 'VOI', 'GRS', 'Zone', 'corr_avg', 'corr_z']
    score_rows = [
        [panel['Date'][i], regimes['TRI'][i], regimes['VSI'][i], regimes['CRI'][i], regimes['LMI'][i], regimes['VOI'][i], regimes['GRS'][i], regimes['Zone'][i], regimes['corr_avg'][i], regimes['corr_z'][i]]
        for i in range(len(panel['Date']))
    ]
    write_csv(BASE / 'data' / 'scores_weekly.csv', score_headers, score_rows)

    eq_rows = [[panel['Date'][i], bt['equity_curve'][i], bt['weekly_returns'][i], bt['turnover'][i]] for i in range(len(panel['Date']))]
    write_csv(BASE / 'data' / 'backtest_equity_curve.csv', ['Date', 'Equity', 'WeeklyReturn', 'Turnover'], eq_rows)

    write_methodology(BASE / 'logs' / 'methodology_v1.md', dqr)

    md = ['# Run Summary', '## Metrics'] + [f"- {k}: {v}" for k, v in bt['metrics'].items()] + ['## Stress Slices'] + [f"- {k}: {v}" for k, v in bt['stress_slices'].items()]
    (BASE / 'logs' / 'run_summary.md').write_text('\n'.join(md), encoding='utf-8')
    write_json(BASE / 'logs' / 'run_summary.json', {'metrics': bt['metrics'], 'stress_slices': bt['stress_slices']})

    logger.info('Pipeline completed successfully.')


if __name__ == '__main__':
    main()
