import json
import logging
from pathlib import Path
from datetime import datetime


def ensure_dirs(base_dir: Path) -> None:
    for p in [base_dir / 'data', base_dir / 'logs', base_dir / 'src']:
        p.mkdir(parents=True, exist_ok=True)


def configure_logging(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger('quant_env')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')

    fh = logging.FileHandler(log_path)
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    sh = logging.StreamHandler()
    sh.setFormatter(formatter)
    logger.addHandler(sh)
    return logger


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, default=str)


def now_utc() -> str:
    return datetime.utcnow().isoformat()
