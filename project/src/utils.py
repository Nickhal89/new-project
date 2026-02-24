import json
import logging
from datetime import datetime
from pathlib import Path


def ensure_dirs(base_dir: Path) -> None:
    for p in [base_dir / 'data', base_dir / 'logs', base_dir / 'src']:
        p.mkdir(parents=True, exist_ok=True)


def configure_logging(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger('quant_env')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

    fh = logging.FileHandler(log_path)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, default=str)


def now_utc() -> str:
    return datetime.utcnow().isoformat()


def write_csv(path: Path, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        f.write(','.join(headers) + '\n')
        for r in rows:
            f.write(','.join('' if v is None else str(v) for v in r) + '\n')
