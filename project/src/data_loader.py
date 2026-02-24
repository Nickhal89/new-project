import csv
import math
import random
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List
from urllib.error import URLError
from urllib.request import urlopen

SYMBOLS = [
    '^GSPC', 'VGK', 'EWJ', 'EEM', 'FXI', 'AGG', 'HYG', 'GLD', 'DBC', 'VNQ', 'BTC-USD', 'DX-Y.NYB'
]


def _fridays(start: date, end: date) -> List[date]:
    d = start
    while d.weekday() != 4:
        d += timedelta(days=1)
    out = []
    while d <= end:
        out.append(d)
        d += timedelta(days=7)
    return out


def _download_stooq(symbol: str) -> Dict[date, float]:
    cleaned = symbol.replace('^', '').replace('-', '')
    url = f'https://stooq.com/q/d/l/?s={cleaned}.us&i=w'
    prices = {}
    with urlopen(url, timeout=20) as resp:
        lines = resp.read().decode('utf-8').strip().splitlines()
    reader = csv.DictReader(lines)
    for row in reader:
        if row.get('Close') in (None, '', '0'):
            continue
        dt = datetime.strptime(row['Date'], '%Y-%m-%d').date()
        prices[dt] = float(row['Close'])
    return prices


def _synthetic_series(symbol: str, dates: List[date]) -> Dict[date, float]:
    seed = abs(hash(symbol)) % (10**6)
    rng = random.Random(seed)
    base = 100.0 + (seed % 40)
    series = {}
    for i, d in enumerate(dates):
        drift = 0.0006 + ((seed % 7) - 3) * 0.00005
        vol = 0.015 + (seed % 10) * 0.001
        cyc = 0.005 * math.sin(i / 26)
        ret = drift + cyc + rng.gauss(0, vol)
        base *= (1 + ret)
        series[d] = round(base, 4)
    return series


def fetch_weekly_data(start='1995-01-01'):
    s = datetime.strptime(start, '%Y-%m-%d').date()
    e = date.today()
    dates = _fridays(s, e)

    panel = {'Date': [d.isoformat() for d in dates]}
    sources = {}

    for sym in SYMBOLS:
        try:
            downloaded = _download_stooq(sym)
            sources[sym] = 'stooq'
        except (URLError, TimeoutError, ValueError, OSError):
            downloaded = _synthetic_series(sym, dates)
            sources[sym] = 'synthetic_fallback'

        values = []
        last = None
        for d in dates:
            px = downloaded.get(d, last)
            if px is None and downloaded:
                prior = [k for k in downloaded if k <= d]
                px = downloaded[max(prior)] if prior else None
            if px is None:
                px = values[-1] if values else 100.0
            values.append(round(float(px), 4))
            last = px
        panel[sym] = values

    return panel, sources


def save_csv(panel: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    headers = list(panel.keys())
    n = len(panel['Date'])
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for i in range(n):
            writer.writerow([panel[h][i] for h in headers])
