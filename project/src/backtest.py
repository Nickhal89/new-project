from statistics import mean


def _ret(panel, asset, i):
    s = panel.get(asset)
    if not s or i <= 0 or s[i - 1] in (None, 0) or s[i] is None:
        return 0.0
    return s[i] / s[i - 1] - 1


def _mdd(curve):
    peak = curve[0]
    m = 0.0
    dds = []
    for x in curve:
        peak = max(peak, x)
        dd = x / peak - 1
        dds.append(dd)
        m = min(m, dd)
    return m, dds


def run_backtest(panel, weights, cost_per_turnover=0.001):
    n = len(panel['Date'])
    curve = [1.0]
    weekly = [0.0]
    turnover = [0.0]
    prev = {}

    assets = ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ', 'REIT', 'COMMOD', 'HY_PROXY', 'BTC', 'AGG_BOND', 'GOLD', 'DXY']
    for i in range(1, n):
        w = weights[i - 1] if i - 1 < len(weights) else {}
        gross = 0.0
        for a in assets:
            gross += w.get(a, 0.0) * _ret(panel, a, i)
        t = 0.5 * sum(abs(w.get(k, 0.0) - prev.get(k, 0.0)) for k in set(w) | set(prev) if k != 'TARGET_VOL')
        net = gross - t * cost_per_turnover
        curve.append(curve[-1] * (1 + net))
        weekly.append(net)
        turnover.append(t)
        prev = w

    cagr = curve[-1] ** (52 / max(1, n - 1)) - 1
    vol = (sum((x - mean(weekly)) ** 2 for x in weekly) / max(1, len(weekly) - 1)) ** 0.5 * (52 ** 0.5)
    sharpe = mean(weekly) / (vol / (52 ** 0.5)) if vol > 0 else 0.0
    downside = [min(0.0, x) for x in weekly]
    dvol = (sum((x - mean(downside)) ** 2 for x in downside) / max(1, len(downside) - 1)) ** 0.5 * (52 ** 0.5)
    sortino = (mean(weekly) * 52) / dvol if dvol > 0 else 0.0
    maxdd, dds = _mdd(curve)
    calmar = cagr / abs(maxdd) if maxdd < 0 else 0.0
    es95 = mean(sorted(weekly)[:max(1, int(0.05 * len(weekly)))])
    rec = 0
    for i in range(len(dds)):
        if dds[i] == maxdd:
            j = i
            while j < len(dds) and dds[j] < 0:
                j += 1
            rec = j - i if j < len(dds) else -1
            break

    def slice_ret(start, end):
        idx = [i for i, d in enumerate(panel['Date']) if start <= d <= end]
        if len(idx) < 2:
            return 0.0
        return curve[idx[-1]] / curve[idx[0]] - 1

    stress = {
        '2000_2002': slice_ret('2000-01-01', '2002-12-31'),
        '2008_2009': slice_ret('2008-01-01', '2009-12-31'),
        '2020': slice_ret('2020-01-01', '2020-12-31'),
        '2022': slice_ret('2022-01-01', '2022-12-31'),
    }

    return {
        'equity_curve': curve,
        'weekly_returns': weekly,
        'turnover': turnover,
        'metrics': {
            'CAGR': cagr, 'Vol': vol, 'Sharpe': sharpe, 'Sortino': sortino,
            'MaxDD': maxdd, 'Calmar': calmar, 'TurnoverAvg': mean(turnover),
            'ES95': es95, 'RecoveryWeeks': rec,
        },
        'stress_slices': stress,
        'drawdowns': dds,
    }
