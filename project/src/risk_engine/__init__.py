from statistics import mean
from typing import List, Optional, Tuple

from .har_rv import har_rv_forecast_from_returns


def weekly_returns(series: List[Optional[float]]) -> List[float]:
    out = [0.0]
    for i in range(1, len(series)):
        a, b = series[i - 1], series[i]
        if a in (None, 0) or b is None:
            out.append(0.0)
        else:
            out.append((b / a) - 1)
    return out


def clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def overlay_scale(target_vol_annual: float, forecast_vol_annual: Optional[float]) -> float:
    if forecast_vol_annual is None or forecast_vol_annual <= 0:
        return 1.0
    return clip(target_vol_annual / forecast_vol_annual, 0.50, 1.25)


def run_har_consistency_checks(forecast_vol: List[Optional[float]]) -> Tuple[bool, List[str]]:
    errs = []
    first = None
    for i, v in enumerate(forecast_vol):
        if v is not None and first is None:
            first = i
        if v is not None and v < 0:
            errs.append(f'negative forecast at {i}')
    if first is not None:
        for i in range(first, len(forecast_vol)):
            if forecast_vol[i] is None:
                errs.append(f'NaN/None after first valid forecast at {i}')
                break
    return (len(errs) == 0), errs


def compute_us_eq_sanity(series: List[Optional[float]]) -> Tuple[bool, dict]:
    rets = weekly_returns(series)
    ann_vol = (sum((r - mean(rets)) ** 2 for r in rets) / max(1, len(rets) - 1)) ** 0.5 * (52 ** 0.5)
    eq = [1.0]
    for r in rets[1:]:
        eq.append(eq[-1] * (1 + r))
    peak = eq[0]
    mdd = 0.0
    for v in eq:
        peak = max(peak, v)
        mdd = min(mdd, v / peak - 1)
    stats = {'annualized_vol': ann_vol, 'max_drawdown': mdd}
    ok = ann_vol >= 0.0 and mdd <= 0.0
    return ok, stats
