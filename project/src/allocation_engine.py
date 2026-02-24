from datetime import datetime
from typing import Optional

from .risk_engine import overlay_scale

ZONE_RISK = {'Strong Expansion': 1.0, 'Expansion': 0.85, 'Neutral': 0.65, 'Deterioration': 0.40, 'Crisis': 0.20}
ZONE_VOL = {'Strong Expansion': 16, 'Expansion': 15, 'Neutral': 14, 'Deterioration': 12, 'Crisis': 10}
BTC_CAP = {'Strong Expansion': 0.25, 'Expansion': 0.20, 'Neutral': 0.10, 'Deterioration': 0.05, 'Crisis': 0.0}

BASE_RISK = {'US_EQ': 0.22, 'EU_EQ': 0.12, 'JP_EQ': 0.08, 'EM_EQ': 0.08, 'CN_EQ': 0.06, 'REIT': 0.08, 'COMMOD': 0.07, 'HY_PROXY': 0.09, 'BTC': 0.04}
BASE_DEF = {'AGG_BOND': 0.6, 'GOLD': 0.3, 'DXY': 0.1}


def _norm(w):
    s = sum(w.values())
    return {k: v / s for k, v in w.items()} if s > 0 else w


def _month(d):
    return datetime.strptime(d, '%Y-%m-%d').strftime('%Y-%m')


def determine_weights(dates, regimes, drawdowns, forecast_vol: Optional[list] = None):
    weights = []
    cur = {}
    dd_throttle = False
    prev_m = None
    for i, d in enumerate(dates):
        if prev_m == _month(d):
            weights.append(cur)
            continue
        prev_m = _month(d)

        z = regimes['Zone'][i]
        rb = ZONE_RISK[z]
        vc = ZONE_VOL[z]
        btc_cap = BTC_CAP[z]

        if regimes['VSI'][i] < 30 or regimes['CRI'][i] < 30:
            btc_cap *= 0.5

        if drawdowns[i] <= -0.15:
            dd_throttle = True
        elif drawdowns[i] > -0.08:
            dd_throttle = False
        if dd_throttle:
            vc -= 2
            btc_cap *= 0.7

        if abs(regimes['corr_avg'][i]) > 0.7 or regimes['corr_z'][i] > 1.5:
            rb *= 0.85

        # HAR overlay: scale risk budget via cash sleeve method
        if forecast_vol is not None:
            fvol = forecast_vol[i - 1] if i > 0 else None  # t-1 signal for week t
            rb *= overlay_scale(vc / 100.0, fvol)

        risk_w = {k: v * rb for k, v in BASE_RISK.items()}
        def_budget = min(0.60, 1 - rb)
        def_w = {k: v * def_budget for k, v in BASE_DEF.items()}
        cash = max(0.0, min(0.30, 1 - (sum(risk_w.values()) + sum(def_w.values()))))

        if risk_w.get('BTC', 0.0) > btc_cap:
            overflow = risk_w['BTC'] - btc_cap
            risk_w['BTC'] = btc_cap
            risk_w['US_EQ'] += overflow

        mix = {**risk_w, **def_w, 'CASH': cash, 'TARGET_VOL': vc / 100.0}
        for k in [k for k in mix if k not in ('CASH', 'TARGET_VOL')]:
            mix[k] = min(0.35, mix[k])

        norm_keys = [k for k in mix if k != 'TARGET_VOL']
        n = _norm({k: mix[k] for k in norm_keys})
        n['TARGET_VOL'] = mix['TARGET_VOL']
        cur = n
        weights.append(cur)
    return weights
