import subprocess
import sys
from pathlib import Path

from src.data_loader import fetch_weekly_data, save_csv
from src.indicators import compute_feature_table
from src.regime_engine import infer_regime
from src.backtest import run_backtest
from src.diagnostics import summary_stats, validate_no_lookahead
from src.utils import configure_logging, ensure_dirs, write_json, now_utc

BASE = Path(__file__).resolve().parent
LOG = BASE / 'logs' / 'run.log'


def attempt_dependency_install(logger):
    logger.info('Attempting dependency installation...')
    script = BASE / 'install_deps.py'
    if not script.exists():
        logger.warning('install_deps.py not found; skipping dependency automation step.')
        return False
    
    try:
        proc = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        logger.warning('Dependency installation timed out; continuing with stdlib fallback.')
        return False
    logger.info('Dependency installer stdout: %s', proc.stdout.strip())
    if proc.returncode != 0:
        logger.warning('Dependency install encountered issues, continuing with stdlib fallback. stderr=%s', proc.stderr[-1000:])
        return False
    return True


def main():
    ensure_dirs(BASE)
    logger = configure_logging(LOG)
    logger.info('Starting run at %s', now_utc())

    install_ok = attempt_dependency_install(logger)

    panel, sources = fetch_weekly_data('1995-01-01')
    csv_path = BASE / 'data' / 'weekly_data.csv'
    save_csv(panel, csv_path)
    logger.info('Saved weekly data to %s', csv_path)
    logger.info('Data sources: %s', sources)

    features = compute_feature_table(panel)
    regimes = infer_regime(features)
    bt = run_backtest(panel, features, regimes)

    stats = summary_stats(bt['equity_curve'], bt['weekly_returns'])
    no_lookahead = validate_no_lookahead()

    report = {
        'dependency_install_success': install_ok,
        'data_sources': sources,
        'summary_stats': stats,
        'lookahead_check_passed': no_lookahead,
        'rows': len(panel['Date']),
    }
    write_json(BASE / 'logs' / 'summary.json', report)

    print('=== System Summary ===')
    print(f"Rows: {report['rows']}")
    print(f"Dependency install success: {install_ok}")
    print('Summary Stats:', stats)
    print(f'No lookahead bias check passed: {no_lookahead}')

    logger.info('Run completed successfully.')


if __name__ == '__main__':
    main()
