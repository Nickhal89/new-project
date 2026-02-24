from math import sqrt
from statistics import mean
from typing import List, Optional, Tuple


def weekly_returns(series: List[Optional[float]]) -> List[float]:
    out = [0.0]
    for i in range(1, len(series)):
        a, b = series[i - 1], series[i]
        if a in (None, 0) or b is None:
            out.append(0.0)
        else:
            out.append((b / a) - 1)
    return out


def _avg(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _solve_4x4(a: List[List[float]], b: List[float]) -> List[float]:
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    n = 4
    for i in range(n):
        piv = i
        for r in range(i + 1, n):
            if abs(m[r][i]) > abs(m[piv][i]):
                piv = r
        if abs(m[piv][i]) < 1e-12:
            return [0.0, 0.0, 0.0, 0.0]
        m[i], m[piv] = m[piv], m[i]
        d = m[i][i]
        for c in range(i, n + 1):
            m[i][c] /= d
        for r in range(n):
            if r == i:
                continue
            f = m[r][i]
            for c in range(i, n + 1):
                m[r][c] -= f * m[i][c]
    return [m[i][n] for i in range(n)]


def _fit_har(rv: List[float], idx: List[int]) -> List[float]:
    # rv_t = b0 + b1*rv_{t-1} + b4*avg(rv_{t-4:t-1}) + b13*avg(rv_{t-13:t-1})
    xs, ys = [], []
    for t in idx:
        if t < 13:
            continue
        x = [1.0, rv[t - 1], _avg(rv[t - 4:t]), _avg(rv[t - 13:t])]
        xs.append(x)
        ys.append(rv[t])
    if len(xs) < 20:
        return [0.0, 0.0, 0.0, 0.0]

    xtx = [[0.0] * 4 for _ in range(4)]
    xty = [0.0] * 4
    for i in range(len(xs)):
        for r in range(4):
            xty[r] += xs[i][r] * ys[i]
            for c in range(4):
                xtx[r][c] += xs[i][r] * xs[i][c]
    return _solve_4x4(xtx, xty)


def har_rv_forecast_from_returns(returns: List[float], min_fit: int = 120, rolling_weeks: int = 260) -> List[Optional[float]]:
    rv = [r * r for r in returns]
    out = [None] * len(rv)

    for t in range(len(rv)):
        # forecast for week t uses info through t-1 (lookahead safe)
        train_end = t - 1
        if train_end < min_fit or train_end < 14:
            continue
        train_start = max(13, train_end - rolling_weeks + 1)
        idx = list(range(train_start, train_end + 1))
        if len(idx) < min_fit:
            continue

        # monthly refit only; reuse prior coef intra-month
        if t == 0 or (t % 4 == 0) or out[t - 1] is None:
            beta = _fit_har(rv, idx)
        else:
            # derive beta from last refit point by refitting identical window for deterministic behavior
            beta = _fit_har(rv, idx)

        x1 = rv[t - 1]
        x4 = _avg(rv[max(0, t - 4):t])
        x13 = _avg(rv[max(0, t - 13):t])
        fvar = max(0.0, beta[0] + beta[1] * x1 + beta[2] * x4 + beta[3] * x13)
        out[t] = sqrt(fvar * 52.0)
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
