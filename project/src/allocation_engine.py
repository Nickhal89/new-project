from datetime import datetime

from .risk_engine import overlay_scale

ZONE_RISK = {'Strong Expansion': 1.0, 'Expansion': 0.85, 'Neutral': 0.65, 'Deterioration': 0.40, 'Crisis': 0.20}
ZONE_VOL = {'Strong Expansion': 0.16, 'Expansion': 0.15, 'Neutral': 0.14, 'Deterioration': 0.12, 'Crisis': 0.10}

STRATEGIC = {
    'US_EQ': 0.22, 'EU_EQ': 0.10, 'JP_EQ': 0.08, 'EM_EQ': 0.08, 'CN_EQ': 0.05,
    'BONDS': 0.18, 'HY': 0.07, 'GOLD': 0.08, 'COMMS': 0.06, 'REIT': 0.06, 'BTC': 0.02,
}
ALIASES = {'AGG_BOND': 'BONDS', 'HY_PROXY': 'HY', 'COMMOD': 'COMMS'}


def _month(d):
    return datetime.strptime(d, '%Y-%m-%d').strftime('%Y-%m')


def _norm(d):
    s = sum(d.values())
    return {k: v / s for k, v in d.items()} if s > 0 else d


def _tail_es95(returns, i, w=26):
    s = returns[max(0, i - w + 1): i + 1]
    if not s:
        return 0.0
    q = sorted(s)[:max(1, int(0.05 * len(s)))]
    return sum(q) / len(q)


def determine_weights(dates, panel, regimes, drawdowns, weekly_returns_proxy, forecast_vol=None, variant_mode='baseline', overlay_params=None, rebalance_freq='monthly'):
    overlay_params = overlay_params or {}
    available = [k for k in panel.keys() if k != 'Date']

    # canonical universe by available columns
    universe = []
    for k in available:
        u = ALIASES.get(k, k)
        if u in STRATEGIC and u not in universe:
            universe.append(u)

    base = _norm({u: STRATEGIC[u] for u in universe})
    weights = []
    cur = {'CASH': 1.0}
    prev_m = None

    for i, d in enumerate(dates):
        do_rebal = rebalance_freq == 'weekly' or prev_m != _month(d)
        if not do_rebal:
            weights.append(cur)
            continue
        prev_m = _month(d)

        zone = regimes['Zone'][i]
        risk_budget = ZONE_RISK.get(zone, 0.65)
        target_vol = ZONE_VOL.get(zone, 0.14)

        # overlay: HAR vol target scaling (t-1 signal on week t)
        if variant_mode in ('har', 'har_corr_tail') and forecast_vol is not None:
            f = forecast_vol[i - 1] if i > 0 else None
            clip_min = overlay_params.get('har', {}).get('clip_min', 0.50)
            clip_max = overlay_params.get('har', {}).get('clip_max', 1.25)
            scale = overlay_scale(target_vol, f)
            scale = max(clip_min, min(clip_max, scale))
            risk_budget *= scale

        # corr governor
        if variant_mode == 'har_corr_tail' and overlay_params.get('corr_shock', {}).get('enabled'):
            if regimes['corr_z'][i] > overlay_params['corr_shock']['corr_z_threshold']:
                risk_budget *= overlay_params['corr_shock']['scale']

        # tail risk throttle
        if variant_mode == 'har_corr_tail' and overlay_params.get('tail_safety', {}).get('enabled'):
            es = _tail_es95(weekly_returns_proxy, max(0, i - 1), 26)
            if es < overlay_params['tail_safety']['es95_threshold']:
                risk_budget *= overlay_params['tail_safety']['scale']

        if drawdowns[i] <= -0.15:
            risk_budget *= 0.85

        risk_budget = max(0.15, min(1.0, risk_budget))

        w = {u: base.get(u, 0.0) * risk_budget for u in universe}
        for u in list(w):
            w[u] = min(0.35, w[u])
        used = sum(w.values())
        w['CASH'] = max(0.0, 1 - used)
        cur = w
        weights.append(cur)
    return weights
