import csv
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import StringIO
from typing import Dict, List, Optional, Tuple
from urllib.error import URLError
from urllib.request import urlopen


@dataclass
class SeriesSpec:
    key: str
    kind: str  # price/spread/index
    attempts: List[Tuple[str, str]]  # (source, symbol)
    late_start_allowed: bool = False


SPECS = [
    SeriesSpec('US_EQ', 'price', [('stooq', '^spx'), ('yahoo', '^GSPC')]),
    SeriesSpec('EU_EQ', 'price', [('stooq', 'vgk.us'), ('yahoo', 'VGK')]),
    SeriesSpec('JP_EQ', 'price', [('stooq', 'ewj.us'), ('yahoo', 'EWJ')]),
    SeriesSpec('EM_EQ', 'price', [('stooq', 'eem.us'), ('yahoo', 'EEM')]),
    SeriesSpec('CN_EQ', 'price', [('stooq', 'fxi.us'), ('yahoo', 'FXI')]),
    SeriesSpec('AGG_BOND', 'price', [('stooq', 'agg.us'), ('yahoo', 'AGG')]),
    SeriesSpec('HY_PROXY', 'price', [('fred', 'BAMLH0A0HYM2'), ('stooq', 'hyg.us'), ('yahoo', 'HYG')]),
    SeriesSpec('GOLD', 'price', [('stooq', 'gld.us'), ('yahoo', 'GLD')]),
    SeriesSpec('COMMOD', 'price', [('stooq', 'dbc.us'), ('yahoo', 'DBC')]),
    SeriesSpec('REIT', 'price', [('stooq', 'vnq.us'), ('yahoo', 'VNQ')]),
    SeriesSpec('DXY', 'index', [('yahoo', 'DX-Y.NYB'), ('fred', 'DTWEXBGS')]),
    SeriesSpec('VIX', 'index', [('yahoo', '^VIX'), ('fred', 'VIXCLS')]),
    SeriesSpec('BTC', 'price', [('yahoo', 'BTC-USD')], late_start_allowed=True),
]


def _download_text(url: str, timeout: int = 20) -> str:
    with urlopen(url, timeout=timeout) as resp:
        return resp.read().decode('utf-8', errors='ignore')


def _fetch_stooq(symbol: str) -> Dict[date, float]:
    url = f'https://stooq.com/q/d/l/?s={symbol}&i=d'
    raw = _download_text(url)
    out = {}
    reader = csv.DictReader(StringIO(raw))
    for r in reader:
        if not r.get('Date') or not r.get('Close'):
            continue
        out[datetime.strptime(r['Date'], '%Y-%m-%d').date()] = float(r['Close'])
    if not out:
        raise ValueError('empty stooq payload')
    return out


def _fetch_yahoo(symbol: str) -> Dict[date, float]:
    period1 = int(datetime(1990, 1, 1).timestamp())
    period2 = int(datetime.utcnow().timestamp())
    url = f'https://query1.finance.yahoo.com/v7/finance/download/{symbol}?period1={period1}&period2={period2}&interval=1d&events=history&includeAdjustedClose=true'
    raw = _download_text(url)
    out = {}
    reader = csv.DictReader(StringIO(raw))
    for r in reader:
        if r.get('Close') in (None, '', 'null'):
            continue
        out[datetime.strptime(r['Date'], '%Y-%m-%d').date()] = float(r['Adj Close'] if r.get('Adj Close') not in (None, '', 'null') else r['Close'])
    if not out:
        raise ValueError('empty yahoo payload')
    return out


def _fetch_fred(series_id: str) -> Dict[date, float]:
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}'
    raw = _download_text(url)
    out = {}
    reader = csv.DictReader(StringIO(raw))
    for r in reader:
        val = r.get(series_id)
        if val in (None, '', '.'):
            continue
        out[datetime.strptime(r['DATE'], '%Y-%m-%d').date()] = float(val)
    if not out:
        raise ValueError('empty fred payload')
    return out


def _fridays(start: date, end: date) -> List[date]:
    d = start
    while d.weekday() != 4:
        d += timedelta(days=1)
    out = []
    while d <= end:
        out.append(d)
        d += timedelta(days=7)
    return out


def _to_weekly_friday(daily: Dict[date, float], fridays: List[date]) -> List[Optional[float]]:
    keys = sorted(daily)
    out = []
    j = 0
    last = None
    for f in fridays:
        while j < len(keys) and keys[j] <= f:
            last = daily[keys[j]]
            j += 1
        out.append(last)
    return out


def _ffill_small_gaps(values: List[Optional[float]], max_gap: int = 2) -> Tuple[List[Optional[float]], int]:
    out = values[:]
    filled = 0
    i = 0
    while i < len(out):
        if out[i] is not None:
            i += 1
            continue
        s = i
        while i < len(out) and out[i] is None:
            i += 1
        gap = i - s
        prev = out[s - 1] if s > 0 else None
        if prev is not None and gap <= max_gap:
            for k in range(s, i):
                out[k] = prev
                filled += 1
    return out, filled


def fetch_all_weekly(start='1995-01-01'):
    start_d = datetime.strptime(start, '%Y-%m-%d').date()
    fridays = _fridays(start_d, date.today())

    panel = {'Date': [d.isoformat() for d in fridays]}
    meta = {'sources': {}, 'attempts': defaultdict(list), 'ffill_count': {}, 'mappings': {}}
    failures = {}

    for spec in SPECS:
        series = None
        for source, symbol in spec.attempts:
            meta['attempts'][spec.key].append(f'{source}:{symbol}')
            try:
                if source == 'stooq':
                    daily = _fetch_stooq(symbol)
                elif source == 'yahoo':
                    daily = _fetch_yahoo(symbol)
                elif source == 'fred':
                    daily = _fetch_fred(symbol)
                else:
                    raise ValueError('unknown source')
                series = _to_weekly_friday(daily, fridays)
                meta['sources'][spec.key] = f'{source}:{symbol}'
                if spec.key == 'HY_PROXY' and source != 'fred':
                    meta['mappings']['HY_PROXY'] = 'Using HY ETF proxy because HY OAS unavailable.'
                break
            except Exception as e:  # noqa: BLE001
                failures.setdefault(spec.key, []).append(f'{source}:{symbol} -> {e}')

        if series is None:
            failures.setdefault(spec.key, []).append('all sources failed')
            continue

        series, nfill = _ffill_small_gaps(series, max_gap=2)
        meta['ffill_count'][spec.key] = nfill
        panel[spec.key] = series

    # global proxy constructed if regions available
    req = ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ']
    if all(k in panel for k in req):
        gl = []
        for i in range(len(fridays)):
            vals = [panel[k][i] for k in req if panel[k][i] is not None]
            gl.append(round(sum(vals) / len(vals), 6) if vals else None)
        panel['GLOBAL_EQ'] = gl
        meta['sources']['GLOBAL_EQ'] = 'constructed:average(US,EU,JP,EM,CN)'

    return panel, meta, failures
