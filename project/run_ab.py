from pathlib import Path

from src.allocation_engine import determine_weights
from src.backtest import ab_consistency_check, run_backtest
from src.indicators import compute_indicators
from src.regime_engine import compute_regime_indices
from src.risk_engine import compute_us_eq_sanity, har_rv_forecast_from_returns, run_har_consistency_checks, weekly_returns
from src.utils import file_sha256, write_csv, write_json


def run_ab(panel, out_dir: Path):
    indicators, rets, corr_avg, corr_z = compute_indicators(panel)
    regimes = compute_regime_indices(panel, indicators, rets, corr_avg, corr_z)

    rv_proxy = panel['GLOBAL_EQ'] if 'GLOBAL_EQ' in panel else panel['US_EQ']
    har_forecast = har_rv_forecast_from_returns(weekly_returns(rv_proxy), rolling_weeks=260, min_fit=120, refit_every_weeks=4)
    ok_har, har_errs = run_har_consistency_checks(har_forecast)
    if not ok_har:
        raise RuntimeError(f'HAR consistency checks failed: {har_errs}')

    ok_sanity, sanity = compute_us_eq_sanity(panel['US_EQ'])
    if not ok_sanity:
        raise RuntimeError(f"US_EQ sanity failed: {sanity}")

    dummy_dd = [0.0] * len(panel['Date'])

    wa = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=None)
    ba = run_backtest(panel, wa, label='A')
    wa = determine_weights(panel['Date'], regimes, ba['drawdowns'], forecast_vol=None)
    ba = run_backtest(panel, wa, label='A')

    wb = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=har_forecast)
    bb = run_backtest(panel, wb, label='B')
    wb = determine_weights(panel['Date'], regimes, bb['drawdowns'], forecast_vol=har_forecast)
    bb = run_backtest(panel, wb, label='B')

    ok_ab, ab_errs = ab_consistency_check(ba, bb)
    if not ok_ab:
        raise RuntimeError(f'A/B consistency checks failed: {ab_errs}')

    out_dir.mkdir(parents=True, exist_ok=True)
    write_csv(out_dir / 'har_vol_forecast_us_eq.csv', ['Date', 'HAR_ForecastVol'], [[panel['Date'][i], har_forecast[i]] for i in range(len(panel['Date']))])
    write_json(out_dir / 'ab_metrics.json', {'A_metrics': ba['metrics'], 'B_metrics': bb['metrics'], 'sanity': sanity, 'SANITY_PASS': True})
    write_json(out_dir / 'stress_slices.json', {'A': ba['stress_slices'], 'B': bb['stress_slices']})
    write_json(out_dir / 'run_summary.json', {'A_metrics': ba['metrics'], 'B_metrics': bb['metrics'], 'har_checks': {'ok': ok_har, 'errors': har_errs}, 'sanity': sanity})

    md = ['# Run Summary', '## Metrics A'] + [f"- {k}: {v}" for k, v in ba['metrics'].items()] + ['## Metrics B'] + [f"- {k}: {v}" for k, v in bb['metrics'].items()]
    (out_dir / 'run_summary.md').write_text('\n'.join(md), encoding='utf-8')
    return {'A': ba, 'B': bb, 'har_forecast': har_forecast, 'sanity': sanity}


def write_provenance(weekly_csv: Path, out_path: Path):
    payload = {
        'weekly_data_file': str(weekly_csv),
        'weekly_data_sha256': file_sha256(weekly_csv),
    }
    write_json(out_path, payload)
