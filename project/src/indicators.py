from statistics import mean
from typing import Dict, List
import math


def _safe_ret(series: List[float], lag: int, i: int) -> float:
    if i - lag < 0 or series[i - lag] in (None, 0) or series[i] is None:
        return 0.0
    return series[i] / series[i - lag] - 1


def zscore_rolling(values: List[float], window: int) -> List[float]:
    out = []
    for i in range(len(values)):
        s = values[max(0, i - window + 1): i + 1]
        m = mean(s)
        v = (sum((x - m) ** 2 for x in s) / max(1, len(s) - 1)) ** 0.5
        out.append((values[i] - m) / v if v > 0 else 0.0)
    return out


def zscore_expanding(values: List[float]) -> List[float]:
    out = []
    for i in range(len(values)):
        s = values[:i + 1]
        m = mean(s)
        v = (sum((x - m) ** 2 for x in s) / max(1, len(s) - 1)) ** 0.5
        out.append((values[i] - m) / v if v > 0 else 0.0)
    return out


def zscore_hybrid(values: List[float], roll_window: int = 260) -> List[float]:
    zr = zscore_rolling(values, roll_window)
    ze = zscore_expanding(values)
    return [0.6 * zr[i] + 0.4 * ze[i] for i in range(len(values))]


def logistic_map_to_0_100(x: float) -> float:
    return 100 / (1 + math.exp(-x))


def _rolling_ma(series: List[float], w: int, i: int) -> float:
    s = [x for x in series[max(0, i - w + 1): i + 1] if x is not None]
    return mean(s) if s else 0.0


def _drawdown_52w(series: List[float], i: int) -> float:
    s = [x for x in series[max(0, i - 51): i + 1] if x is not None]
    if not s:
        return 0.0
    peak = max(s)
    cur = s[-1]
    return (cur / peak) - 1 if peak else 0.0


def _rv(returns: List[float], w: int, i: int) -> float:
    s = returns[max(0, i - w + 1): i + 1]
    m = mean(s)
    return (sum((x - m) ** 2 for x in s) / max(1, len(s) - 1)) ** 0.5


def compute_indicators(panel: Dict[str, List]):
    assets = [k for k in panel if k != 'Date']
    n = len(panel['Date'])
    out = {k: {'ret_4w': [], 'ret_13w': [], 'ret_52w': [], 'ma_10w': [], 'ma_40w': [], 'dd_52w': [], 'rv_4w': [], 'rv_13w': [], 'rv_26w': []} for k in assets}
    rets = {k: [] for k in assets}

    for k in assets:
        series = panel[k]
        for i in range(n):
            r1 = _safe_ret(series, 1, i)
            rets[k].append(r1)
            out[k]['ret_4w'].append(_safe_ret(series, 4, i))
            out[k]['ret_13w'].append(_safe_ret(series, 13, i))
            out[k]['ret_52w'].append(_safe_ret(series, 52, i))
            out[k]['ma_10w'].append(_rolling_ma(series, 10, i))
            out[k]['ma_40w'].append(_rolling_ma(series, 40, i))
            out[k]['dd_52w'].append(_drawdown_52w(series, i))
            out[k]['rv_4w'].append(_rv(rets[k], 4, i))
            out[k]['rv_13w'].append(_rv(rets[k], 13, i))
            out[k]['rv_26w'].append(_rv(rets[k], 26, i))

    core = [x for x in ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ', 'AGG_BOND', 'GOLD', 'DXY'] if x in rets]
    corr_avg = []
    for i in range(n):
        vals = []
        for a in range(len(core)):
            for b in range(a + 1, len(core)):
                sa = rets[core[a]][max(0, i - 12): i + 1]
                sb = rets[core[b]][max(0, i - 12): i + 1]
                if len(sa) < 3:
                    vals.append(0.0)
                    continue
                ma, mb = mean(sa), mean(sb)
                va = (sum((x - ma) ** 2 for x in sa) / max(1, len(sa) - 1)) ** 0.5
                vb = (sum((x - mb) ** 2 for x in sb) / max(1, len(sb) - 1)) ** 0.5
                if va == 0 or vb == 0:
                    vals.append(0.0)
                else:
                    cov = sum((sa[j] - ma) * (sb[j] - mb) for j in range(len(sa))) / max(1, len(sa) - 1)
                    vals.append(cov / (va * vb))
        corr_avg.append(sum(vals) / len(vals) if vals else 0.0)

    corr_hybrid_z = zscore_hybrid(corr_avg)
    return out, rets, corr_avg, corr_hybrid_z
