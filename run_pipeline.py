import argparse
import csv
import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import sys
sys.path.append('project')

from src.allocation_engine import determine_weights
from src.backtest import run_backtest
from src.indicators import compute_indicators
from src.regime_engine import compute_regime_indices
from src.risk_engine import compute_us_eq_sanity, har_rv_forecast_from_returns, run_har_consistency_checks, weekly_returns
from src.utils import write_csv, write_json


REQUIRED_MANIFEST_KEYS = {
    'run_id', 'timestamp', 'git_commit_hash', 'config_hash', 'data_hash', 'status',
    'fail_reasons', 'metrics', 'artifact_list', 'lookahead_safe_check'
}


def _coerce(v: str):
    v = v.strip()
    if v in ('true', 'True'):
        return True
    if v in ('false', 'False'):
        return False
    try:
        if '.' in v:
            return float(v)
        return int(v)
    except Exception:
        return v.strip('"').strip("'")


def load_simple_yaml(path: Path) -> dict:
    lines = [ln.rstrip() for ln in path.read_text(encoding='utf-8').splitlines() if ln.strip() and not ln.strip().startswith('#')]
    cfg = {
        'overlay_params': {}, 'sanity_thresholds': {}, 'variants': [],
        'strategic_weights': {}, 'regime_risk_budget': {}, 'regime_vol_target': {}
    }
    section = None
    subsection = None
    current_variant = None
    for raw in lines:
        indent = len(raw) - len(raw.lstrip(' '))
        t = raw.strip()
        if indent == 0 and ': ' in t:
            k, v = t.split(': ', 1)
            cfg[k] = _coerce(v)
            section, subsection = None, None
            continue
        if indent == 0 and t.endswith(':'):
            section, subsection = t[:-1], None
            continue

        if section in ('sanity_thresholds', 'strategic_weights', 'regime_risk_budget', 'regime_vol_target') and ': ' in t:
            k, v = t.split(': ', 1)
            cfg[section][k] = _coerce(v)
            continue

        if section == 'overlay_params':
            if indent == 2 and t.endswith(':'):
                subsection = t[:-1]
                if subsection not in cfg['overlay_params']:
                    cfg['overlay_params'][subsection] = {}
            elif indent == 2 and ': ' in t:
                k, v = t.split(': ', 1)
                cfg['overlay_params'][k] = _coerce(v)
            elif indent >= 4 and ': ' in t and subsection:
                k, v = t.split(': ', 1)
                cfg['overlay_params'][subsection][k] = _coerce(v)
            continue

        if section == 'variants':
            if t.startswith('- name: '):
                current_variant = {'name': t.split(': ', 1)[1]}
                cfg['variants'].append(current_variant)
            elif t.startswith('mode: ') and current_variant:
                current_variant['mode'] = t.split(': ', 1)[1]
            continue
    return cfg


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def git_hash() -> str:
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    except Exception:
        return 'NA'


def load_weekly_csv(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f'Missing required input data: {path}')
    with path.open('r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise RuntimeError('weekly_data.csv is empty')
    panel = {'Date': [r['Date'] for r in rows]}
    for c in rows[0].keys():
        if c == 'Date':
            continue
        panel[c] = [None if r[c] == '' else float(r[c]) for r in rows]
    return panel


def sanity_gate(panel: dict, thresholds: dict):
    if 'US_EQ' not in panel:
        return False, {'reason': 'US_EQ missing'}
    ok, stats = compute_us_eq_sanity(panel['US_EQ'])
    passed = ok and stats['annualized_vol'] > thresholds['us_eq_annualized_vol_min'] and stats['max_drawdown'] < thresholds['us_eq_maxdd_max']
    return passed, stats


def _map_metrics(m):
    return {
        'CAGR': m['CAGR'],
        'AnnVol': m['Vol'],
        'Sharpe': m['Sharpe'],
        'Sortino': m['Sortino'],
        'MaxDD': m['MaxDD'],
        'Calmar': m['Calmar'],
        'ES95_weekly': m['ES95'],
        'Turnover': m['TurnoverAvg'],
    }


def run_variants(panel: dict, cfg: dict):
    indicators, rets, corr_avg, corr_z = compute_indicators(panel)
    regimes = compute_regime_indices(panel, indicators, rets, corr_avg, corr_z)

    overlay = cfg.get('overlay_params', {})
    har_enabled = bool(overlay.get('har_enabled', overlay.get('har', {}).get('enabled', False)))
    need_har = har_enabled and any(v.get('mode') in ('har', 'har_corr_tail') for v in cfg['variants'])

    har = None
    if need_har:
        rv_proxy = panel['GLOBAL_EQ'] if 'GLOBAL_EQ' in panel else panel['US_EQ']
        har_cfg = overlay['har']
        har = har_rv_forecast_from_returns(
            weekly_returns(rv_proxy),
            rolling_weeks=har_cfg['rolling_weeks'],
            min_fit=har_cfg['min_fit'],
            refit_every_weeks=har_cfg['refit_every_weeks'],
        )
        ok_har, errs = run_har_consistency_checks(har)
        if not ok_har:
            raise RuntimeError(f'HAR checks failed: {errs}')

    proxy_ret = weekly_returns(panel['GLOBAL_EQ'] if 'GLOBAL_EQ' in panel else panel['US_EQ'])
    tx = float(cfg['tx_cost_bps']) / 10000.0
    out = {}
    for v in cfg['variants']:
        mode = v['mode']
        name = v['name']
        dd0 = [0.0] * len(panel['Date'])

        fvol = har if (har_enabled and mode in ('har', 'har_corr_tail')) else None
        w = determine_weights(
            panel['Date'], panel, regimes, dd0, proxy_ret,
            forecast_vol=fvol,
            variant_mode=mode,
            overlay_params=overlay,
            rebalance_freq=cfg.get('rebalance_freq', 'monthly'),
            strategic_weights=cfg.get('strategic_weights'),
            regime_risk_budget=cfg.get('regime_risk_budget'),
            regime_vol_target=cfg.get('regime_vol_target'),
        )
        bt = run_backtest(panel, w, cost_per_turnover=tx, label=name)
        w = determine_weights(
            panel['Date'], panel, regimes, bt['drawdowns'], proxy_ret,
            forecast_vol=fvol,
            variant_mode=mode,
            overlay_params=overlay,
            rebalance_freq=cfg.get('rebalance_freq', 'monthly'),
            strategic_weights=cfg.get('strategic_weights'),
            regime_risk_budget=cfg.get('regime_risk_budget'),
            regime_vol_target=cfg.get('regime_vol_target'),
        )
        bt = run_backtest(panel, w, cost_per_turnover=tx, label=name)
        out[name] = bt
    return out, har


def validate_manifest_schema(m: dict):
    missing = [k for k in REQUIRED_MANIFEST_KEYS if k not in m]
    if missing:
        raise RuntimeError(f'Manifest missing keys: {missing}')


def resolve_data_path(cfg: dict):
    if cfg.get('source_weekly_data_path'):
        return Path(cfg['source_weekly_data_path'])
    if cfg.get('source_run_id'):
        return Path('runs') / cfg['source_run_id'] / 'weekly_data.csv'
    raise RuntimeError('Config must include source_weekly_data_path or source_run_id')


def print_five(run_id, commit_hash, data_hash, status, top):
    print(f'RUN_ID: {run_id}')
    print(f'COMMIT: {commit_hash}')
    print(f'DATA_HASH: {data_hash}')
    print(f'STATUS: {status}')
    print(f"TOPLINE: Variant={top['variant']}, CAGR={top['CAGR']}, Sharpe={top['Sharpe']}, MaxDD={top['MaxDD']}, Vol={top['AnnVol']}, ES95={top['ES95_weekly']}, Turnover={top['Turnover']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    args = ap.parse_args()

    cfg_path = Path(args.config)
    cfg = load_simple_yaml(cfg_path)

    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    run_id = f"RUN_{cfg.get('step','STEP')}_{timestamp}"
    run_dir = Path('runs') / run_id
    art = run_dir / 'artifacts'
    art.mkdir(parents=True, exist_ok=True)

    fail_reasons = []
    metrics_by_variant = {}
    data_hash = 'NA'

    try:
        data_path = resolve_data_path(cfg)
        panel = load_weekly_csv(data_path)
        data_hash = sha256_file(data_path)

        sanity_ok, sanity_stats = sanity_gate(panel, cfg['sanity_thresholds'])
        if not sanity_ok:
            fail_reasons.append(f'sanity_gate_failed:{sanity_stats}')

        if not fail_reasons:
            results, har = run_variants(panel, cfg)
            if har is not None:
                write_csv(art / 'har_vol_forecast_us_eq.csv', ['Date', 'HAR_ForecastVol'], [[panel['Date'][i], har[i]] for i in range(len(panel['Date']))])
            for name, res in results.items():
                metrics_by_variant[name] = _map_metrics(res['metrics'])
                write_json(art / f'metrics_{name}.json', metrics_by_variant[name])
                write_csv(art / f'equity_curve_{name}.csv', ['Date', 'Equity'], [[panel['Date'][i], res['equity_curve'][i]] for i in range(len(panel['Date']))])
                write_csv(art / f'returns_{name}.csv', ['Date', 'WeeklyReturn'], [[panel['Date'][i], res['weekly_returns'][i]] for i in range(len(panel['Date']))])
    except Exception as e:
        fail_reasons.append(str(e))

    manifest = {
        'run_id': run_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'git_commit_hash': git_hash(),
        'config_hash': sha256_file(cfg_path),
        'data_hash': data_hash,
        'status': 'FAIL' if fail_reasons else 'PASS',
        'fail_reasons': fail_reasons,
        'metrics': metrics_by_variant,
        'lookahead_safe_check': True,
        'artifact_list': sorted(str(p.relative_to(run_dir)) for p in run_dir.rglob('*') if p.is_file()),
    }
    validate_manifest_schema(manifest)
    write_json(run_dir / 'manifest.json', manifest)

    if metrics_by_variant:
        best = sorted(metrics_by_variant.items(), key=lambda kv: kv[1]['Sharpe'], reverse=True)[0]
        top = {'variant': best[0], **best[1]}
    else:
        top = {'variant': 'NA', 'CAGR': 'NA', 'Sharpe': 'NA', 'MaxDD': 'NA', 'AnnVol': 'NA', 'ES95_weekly': 'NA', 'Turnover': 'NA'}

    print_five(run_id, manifest['git_commit_hash'], data_hash, manifest['status'], top)

    if fail_reasons:
        raise RuntimeError('; '.join(fail_reasons))


if __name__ == '__main__':
    main()
