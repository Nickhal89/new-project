from pathlib import Path

import subprocess
import sys

from src.allocation_engine import determine_weights
from src.backtest import ab_consistency_check, run_backtest
from src.data_loader import fetch_all_weekly
from src.diagnostics import data_quality_report, write_quality_reports
from src.indicators import compute_indicators
from src.regime_engine import compute_regime_indices
from src.risk_engine import har_rv_forecast_from_returns, run_har_consistency_checks, weekly_returns
from src.utils import configure_logging, ensure_dirs, write_csv, write_json

BASE = Path(__file__).resolve().parent


def write_methodology(path: Path, report: dict):
    txt = [
        '# Methodology v1',
        '- Scoring indices: TRI, VSI, CRI, LMI, VOI mapped to 0-100 and combined into GRS.',
        '- Portfolio is long-only, no leverage, no shorting.',
        '- Risk controls: regime risk budgets, vol targets, concentration caps, corr governor, drawdown throttle, convex sleeve caps.',
        '- HAR-RV overlay: monthly rolling 5y HAR fit over weekly realized variance with scale clip [0.50,1.25].',
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

    # HAR-RV overlay signal (lookahead-safe use at t-1 in allocator)
    rv_proxy = panel['GLOBAL_EQ'] if 'GLOBAL_EQ' in panel else panel['US_EQ']
    har_forecast = har_rv_forecast_from_returns(weekly_returns(rv_proxy), min_fit=120, rolling_weeks=260)
    ok_har, har_errs = run_har_consistency_checks(har_forecast)
    if not ok_har:
        raise RuntimeError(f'HAR consistency checks failed: {har_errs}')

    dummy_dd = [0.0] * len(panel['Date'])

    # A: baseline
    wa = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=None)
    ba = run_backtest(panel, wa, label='A')
    wa = determine_weights(panel['Date'], regimes, ba['drawdowns'], forecast_vol=None)
    ba = run_backtest(panel, wa, label='A')

    # B: HAR overlay
    wb = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=har_forecast)
    bb = run_backtest(panel, wb, label='B')
    wb = determine_weights(panel['Date'], regimes, bb['drawdowns'], forecast_vol=har_forecast)
    bb = run_backtest(panel, wb, label='B')

    ok_ab, ab_errs = ab_consistency_check(ba, bb)
    if not ok_ab:
        raise RuntimeError(f'A/B consistency checks failed: {ab_errs}')

    write_csv(BASE / 'data' / 'weekly_data.csv', list(panel.keys()), zip(*[panel[k] for k in panel.keys()]))
    score_headers = ['Date', 'TRI', 'VSI', 'CRI', 'LMI', 'VOI', 'GRS', 'Zone', 'corr_avg', 'corr_z', 'HAR_ForecastVol']
    score_rows = [
        [panel['Date'][i], regimes['TRI'][i], regimes['VSI'][i], regimes['CRI'][i], regimes['LMI'][i], regimes['VOI'][i], regimes['GRS'][i], regimes['Zone'][i], regimes['corr_avg'][i], regimes['corr_z'][i], har_forecast[i]]
        for i in range(len(panel['Date']))
    ]
    write_csv(BASE / 'data' / 'scores_weekly.csv', score_headers, score_rows)

    rows_a = [[panel['Date'][i], ba['equity_curve'][i], ba['weekly_returns'][i], ba['turnover'][i]] for i in range(len(panel['Date']))]
    rows_b = [[panel['Date'][i], bb['equity_curve'][i], bb['weekly_returns'][i], bb['turnover'][i]] for i in range(len(panel['Date']))]
    write_csv(BASE / 'data' / 'backtest_equity_curve_A.csv', ['Date', 'Equity', 'WeeklyReturn', 'Turnover'], rows_a)
    write_csv(BASE / 'data' / 'backtest_equity_curve_B.csv', ['Date', 'Equity', 'WeeklyReturn', 'Turnover'], rows_b)

    write_methodology(BASE / 'logs' / 'methodology_v1.md', dqr)
    md = ['# Run Summary', '## Metrics A'] + [f"- {k}: {v}" for k, v in ba['metrics'].items()] + ['## Metrics B'] + [f"- {k}: {v}" for k, v in bb['metrics'].items()]
    (BASE / 'logs' / 'run_summary.md').write_text('\n'.join(md), encoding='utf-8')

    write_json(BASE / 'logs' / 'stress_slices.json', {'A': ba['stress_slices'], 'B': bb['stress_slices']})
    write_json(BASE / 'logs' / 'run_summary.json', {'A_metrics': ba['metrics'], 'B_metrics': bb['metrics'], 'har_checks': {'ok': ok_har, 'errors': har_errs}})
    logger.info('Pipeline completed successfully (A/B).')


if __name__ == '__main__':
    main()
