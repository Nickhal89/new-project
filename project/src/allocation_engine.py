from datetime import datetime

from .risk_engine import overlay_scale

DEFAULT_ZONE_RISK = {'Strong Expansion': 1.0, 'Expansion': 0.85, 'Neutral': 0.65, 'Deterioration': 0.40, 'Crisis': 0.20}
DEFAULT_ZONE_VOL = {'Strong Expansion': 0.16, 'Expansion': 0.15, 'Neutral': 0.14, 'Deterioration': 0.12, 'Crisis': 0.10}
DEFAULT_STRATEGIC = {
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


def _cfg_zone_map(cfg_map, fallback):
    if not cfg_map:
        return fallback
    # allow keys with/without space (StrongExpansion vs Strong Expansion)
    out = {}
    for k, v in cfg_map.items():
        key = k.replace('StrongExpansion', 'Strong Expansion')
        out[key] = v
    merged = dict(fallback)
    merged.update(out)
    return merged


def determine_weights(
    dates,
    panel,
    regimes,
    drawdowns,
    weekly_returns_proxy,
    forecast_vol=None,
    variant_mode='baseline',
    overlay_params=None,
    rebalance_freq='monthly',
    strategic_weights=None,
    regime_risk_budget=None,
    regime_vol_target=None,
):
    overlay_params = overlay_params or {}
    strategic = strategic_weights or DEFAULT_STRATEGIC
    zone_risk = _cfg_zone_map(regime_risk_budget, DEFAULT_ZONE_RISK)
    zone_vol = _cfg_zone_map(regime_vol_target, DEFAULT_ZONE_VOL)

    available = [k for k in panel.keys() if k != 'Date']
    universe = []
    for k in available:
        u = ALIASES.get(k, k)
        if u in strategic and u not in universe:
            universe.append(u)
    base = _norm({u: strategic[u] for u in universe})

    weights = []
    cur = {'CASH': 1.0}
    prev_m = None

    har_enabled = bool(overlay_params.get('har_enabled', overlay_params.get('har', {}).get('enabled', False)))
    corr_enabled = bool(overlay_params.get('corr_shock_enabled', overlay_params.get('corr_shock', {}).get('enabled', False)))
    tail_enabled = bool(overlay_params.get('tail_risk_enabled', overlay_params.get('tail_safety', {}).get('enabled', False)))

    for i, d in enumerate(dates):
        do_rebal = rebalance_freq == 'weekly' or prev_m != _month(d)
        if not do_rebal:
            weights.append(cur)
            continue
        prev_m = _month(d)

        zone = regimes['Zone'][i]
        risk_budget = zone_risk.get(zone, 0.65)
        target_vol = zone_vol.get(zone, 0.14)

        if variant_mode in ('har', 'har_corr_tail') and har_enabled and forecast_vol is not None:
            f = forecast_vol[i - 1] if i > 0 else None
            clip_min = overlay_params.get('har', {}).get('clip_min', 0.50)
            clip_max = overlay_params.get('har', {}).get('clip_max', 1.25)
            scale = overlay_scale(target_vol, f)
            scale = max(clip_min, min(clip_max, scale))
            risk_budget *= scale

        if variant_mode == 'har_corr_tail' and corr_enabled:
            thr = overlay_params.get('corr_shock', {}).get('corr_z_threshold', 1.5)
            sc = overlay_params.get('corr_shock', {}).get('scale', 0.85)
            if regimes['corr_z'][i] > thr:
                risk_budget *= sc

        if variant_mode == 'har_corr_tail' and tail_enabled:
            es = _tail_es95(weekly_returns_proxy, max(0, i - 1), 26)
            thr = overlay_params.get('tail_safety', {}).get('es95_threshold', -0.035)
            sc = overlay_params.get('tail_safety', {}).get('scale', 0.80)
            if es < thr:
                risk_budget *= sc

        if drawdowns[i] <= -0.15:
            risk_budget *= 0.85

        risk_budget = max(0.15, min(1.0, risk_budget))
        w = {u: min(0.35, base.get(u, 0.0) * risk_budget) for u in universe}
        used = sum(w.values())
        w['CASH'] = max(0.0, 1 - used)
        cur = w
        weights.append(cur)
    return weights
