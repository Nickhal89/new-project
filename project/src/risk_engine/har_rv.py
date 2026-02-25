from math import sqrt
from typing import List, Optional


def _avg(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _solve_4x4(a, b):
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


def _fit_har(rv: List[float], idx: List[int]):
    xs, ys = [], []
    for t in idx:
        if t < 13:
            continue
        xs.append([1.0, rv[t - 1], _avg(rv[t - 4:t]), _avg(rv[t - 13:t])])
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


def har_rv_forecast_from_returns(
    returns: List[float],
    rolling_weeks: int = 260,
    min_fit: int = 120,
    refit_every_weeks: int = 4,
) -> List[Optional[float]]:
    rv = [r * r for r in returns]
    out: List[Optional[float]] = [None] * len(rv)
    beta = None

    for t in range(len(rv)):
        train_end = t - 1  # lookahead-safe
        if train_end < 14:
            continue

        train_start = max(13, train_end - rolling_weeks + 1)
        idx = list(range(train_start, train_end + 1))
        if len(idx) < min_fit:
            continue

        if beta is None or (t % refit_every_weeks == 0):
            beta = _fit_har(rv, idx)

        x1 = rv[t - 1]
        x4 = _avg(rv[max(0, t - 4):t])
        x13 = _avg(rv[max(0, t - 13):t])
        fvar = max(0.0, beta[0] + beta[1] * x1 + beta[2] * x4 + beta[3] * x13)
        out[t] = sqrt(fvar * 52.0)
    return out
