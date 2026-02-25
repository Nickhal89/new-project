import logging
import subprocess
import sys
import time
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent / 'logs' / 'dependency_install.log'
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(filename=LOG_PATH, level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

PACKAGES = [
    'pandas', 'numpy', 'yfinance', 'pandas_datareader', 'statsmodels',
    'arch', 'scikit-learn', 'matplotlib', 'seaborn', 'riskfolio-lib', 'linearmodels'
]
INDEXES = [None, 'https://pypi.org/simple', 'https://pypi.python.org/simple']


def install_one(pkg: str) -> bool:
    for idx in INDEXES:
        for attempt in range(1, 2):
            cmd = [sys.executable, '-m', 'pip', 'install', pkg, '--retries', '5', '--timeout', '8']
            if idx:
                cmd += ['-i', idx]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode == 0:
                logging.info('Installed %s via %s attempt %s', pkg, idx or 'default', attempt)
                return True
            logging.warning('Install failed for %s via %s attempt %s: %s', pkg, idx or 'default', attempt, proc.stderr[-500:])
            time.sleep(0.2)
    return False


def main() -> int:
    failed = []
    for p in PACKAGES:
        if not install_one(p):
            failed.append(p)

    if failed:
        logging.error('Dependency install failures: %s', ', '.join(failed))
        print('Dependency installation failed for:', ', '.join(failed))
        return 1
    print('All dependencies installed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
