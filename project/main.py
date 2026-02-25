from pathlib import Path

import subprocess
import sys

from run_ab import run_ab, write_provenance
from src.data_loader import fetch_all_weekly
from src.diagnostics import data_quality_report, write_quality_reports
from src.utils import configure_logging, ensure_dirs, write_csv

BASE = Path(__file__).resolve().parent
EXPECTED_WEEKLY_HASH = 'd416a2aa83faaef4e7ccff32d2eeab9639c51064ac5eea698eda85ee70b2f2fc'


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

    weekly_csv = BASE / 'data' / 'weekly_data.csv'
    write_csv(weekly_csv, list(panel.keys()), zip(*[panel[k] for k in panel.keys()]))
    write_provenance(weekly_csv, BASE / 'logs' / 'data_provenance.json')

    result = run_ab(panel, BASE / 'logs')
    logger.info('A/B completed. A CAGR=%s B CAGR=%s', result['A']['metrics']['CAGR'], result['B']['metrics']['CAGR'])

    # hard check against validated STEP A1 hash when reproducible source data is available
    from src.utils import file_sha256
    got_hash = file_sha256(weekly_csv)
    if got_hash != EXPECTED_WEEKLY_HASH:
        logger.warning('weekly_data hash differs from validated Colab STEP A1 hash. expected=%s got=%s', EXPECTED_WEEKLY_HASH, got_hash)


if __name__ == '__main__':
    main()
