import argparse
import csv
import hashlib
import json
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

RISK_KEYS = ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ', 'REIT', 'COMMOD', 'HY_PROXY', 'BTC']


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
    cfg = {'overlay_params': {}, 'sanity_thresholds': {}, 'variants': []}
    section = None
    subsection = None
    current_variant = None

    for raw in lines:
        indent = len(raw) - len(raw.lstrip(' '))
        t = raw.strip()

        if indent == 0 and ': ' in t:
            k, v = t.split(': ', 1)
            cfg[k] = _coerce(v)
            section = None
            subsection = None
            continue
        if indent == 0 and t.endswith(':'):
            section = t[:-1]
            subsection = None
            continue

        if section == 'overlay_params':
            if indent == 2 and t.endswith(':'):
                subsection = t[:-1]
                cfg['overlay_params'][subsection] = {}
            elif indent >= 4 and ': ' in t and subsection:
                k, v = t.split(': ', 1)
                cfg['overlay_params'][subsection][k] = _coerce(v)
            continue

        if section == 'sanity_thresholds' and ': ' in t:
            k, v = t.split(': ', 1)
            cfg['sanity_thresholds'][k] = _coerce(v)
            continue

        if section == 'variants':
            if t.startswith('- name: '):
                current_variant = {'name': t.split(': ', 1)[1]}
                cfg['variants'].append(current_variant)
            elif t.startswith('mode: ') and current_variant is not None:
                current_variant['mode'] = t.split(': ', 1)[1]
            continue

    return cfg


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def git_commit_hash() -> str:
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    except Exception:
        return 'unknown'


def load_weekly_csv(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f'Missing required input data: {path}')
    with path.open('r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    panel = {'Date': [r['Date'] for r in rows]}
    for k in rows[0].keys():
        if k == 'Date':
            continue
        vals = []
        for r in rows:
            raw = r[k]
            vals.append(None if raw == '' else float(raw))
        panel[k] = vals
    return panel


def sanity_gate(panel: dict, thresholds: dict):
    ok, stats = compute_us_eq_sanity(panel['US_EQ'])
    gate = ok and stats['annualized_vol'] > thresholds['us_eq_annualized_vol_min'] and stats['max_drawdown'] < thresholds['us_eq_maxdd_max']
    return gate, stats


def apply_corr_tail_overlay(weights, regimes, drawdowns, overlay_params):
    out = []
    for i, w in enumerate(weights):
        j = max(0, i - 1)
        scale = 1.0
        if overlay_params.get('corr_shock', {}).get('enabled') and abs(regimes['corr_avg'][j]) > overlay_params['corr_shock']['threshold']:
            scale *= overlay_params['corr_shock']['scale']
        if overlay_params.get('tail_risk', {}).get('enabled') and drawdowns[j] <= overlay_params['tail_risk']['dd_threshold']:
            scale *= overlay_params['tail_risk']['scale']

        nw = dict(w)
        risk_total = sum(nw.get(k, 0.0) for k in RISK_KEYS)
        target_risk = risk_total * scale
        if risk_total > 0:
            for k in RISK_KEYS:
                nw[k] = nw.get(k, 0.0) * (target_risk / risk_total)
        used = sum(v for k, v in nw.items() if k != 'TARGET_VOL')
        nw['CASH'] = nw.get('CASH', 0.0) + max(0.0, 1 - used)
        out.append(nw)
    return out


def run_variants(panel, cfg):
    indicators, rets, corr_avg, corr_z = compute_indicators(panel)
    regimes = compute_regime_indices(panel, indicators, rets, corr_avg, corr_z)

    har_cfg = cfg['overlay_params']['har']
    rv_proxy = panel['GLOBAL_EQ'] if 'GLOBAL_EQ' in panel else panel['US_EQ']
    har_forecast = har_rv_forecast_from_returns(
        weekly_returns(rv_proxy),
        rolling_weeks=har_cfg['rolling_weeks'],
        min_fit=har_cfg['min_fit'],
        refit_every_weeks=har_cfg['refit_every_weeks'],
    )
    ok_har, errs = run_har_consistency_checks(har_forecast)
    if not ok_har:
        raise RuntimeError(f'HAR checks failed: {errs}')

    results = {}
    for var in cfg['variants']:
        mode = var['mode']
        name = var['name']
        dummy_dd = [0.0] * len(panel['Date'])

        if mode == 'baseline':
            w = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=None)
            bt = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
            w = determine_weights(panel['Date'], regimes, bt['drawdowns'], forecast_vol=None)
            bt = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
        elif mode == 'har':
            w = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=har_forecast)
            bt = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
            w = determine_weights(panel['Date'], regimes, bt['drawdowns'], forecast_vol=har_forecast)
            bt = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
        elif mode == 'har_corr_tail':
            w = determine_weights(panel['Date'], regimes, dummy_dd, forecast_vol=har_forecast)
            bt0 = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
            w = apply_corr_tail_overlay(w, regimes, bt0['drawdowns'], cfg['overlay_params'])
            bt = run_backtest(panel, w, cost_per_turnover=cfg['transaction_cost'], label=name)
        else:
            raise ValueError(f'Unknown variant mode: {mode}')

        results[name] = bt
    return results, har_forecast


def write_manifest(run_dir: Path, cfg_path: Path, data_path: Path, cfg: dict, results: dict, sanity_ok: bool, sanity_stats: dict):
    artifacts = sorted(str(p.relative_to(run_dir)) for p in run_dir.rglob('*') if p.is_file() and p.name != 'manifest.json')
    manifest = {
        'run_id': run_dir.name,
        'status': 'PASS' if sanity_ok else 'FAIL',
        'commit_hash': git_commit_hash(),
        'config_path': str(cfg_path),
        'config_hash': sha256_file(cfg_path),
        'data_path': str(data_path),
        'data_hash': sha256_file(data_path),
        'start_utc': cfg['_start_utc'],
        'end_utc': datetime.now(timezone.utc).isoformat(),
        'metrics': {k: v['metrics'] for k, v in results.items()},
        'sanity': sanity_stats,
        'artifact_list': artifacts,
    }
    write_json(run_dir / 'manifest.json', manifest)
    return manifest


def write_five_line_summary(manifest: dict, out_path: Path):
    metrics = manifest['metrics']
    cagrA = metrics.get('A', {}).get('CAGR', 'N/A')
    cagrB = metrics.get('B', {}).get('CAGR', 'N/A')
    cagrC = metrics.get('C', {}).get('CAGR', 'N/A')
    lines = [
        f"RUN_ID: {manifest['run_id']} | STATUS: {manifest['status']}",
        f"CONFIG: {manifest['config_path']} | CONFIG_HASH: {manifest['config_hash'][:12]}",
        f"DATA: {manifest['data_path']} | DATA_HASH: {manifest['data_hash'][:12]}",
        f"VARIANTS: A={cagrA}, B={cagrB}, C={cagrC}",
        f"ARTIFACTS: {len(manifest['artifact_list'])} files | COMMIT: {manifest['commit_hash'][:12]}",
    ]
    out_path.write_text('\n'.join(lines), encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    args = ap.parse_args()

    cfg_path = Path(args.config)
    cfg = load_simple_yaml(cfg_path)
    cfg['_start_utc'] = datetime.now(timezone.utc).isoformat()

    data_path = Path('runs') / cfg['source_run_id'] / 'weekly_data.csv'
    panel = load_weekly_csv(data_path)

    sanity_ok, sanity_stats = sanity_gate(panel, cfg['sanity_thresholds'])
    if not sanity_ok:
        raise RuntimeError(f'Sanity gate failed: {sanity_stats}')

    results, har_forecast = run_variants(panel, cfg)

    run_id = f"RUN_{cfg['step']}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    run_dir = Path('runs') / run_id
    art = run_dir / 'artifacts'
    art.mkdir(parents=True, exist_ok=True)

    for name, res in results.items():
        write_json(art / f'metrics_{name}.json', res['metrics'])
        write_csv(art / f'equity_curve_{name}.csv', ['Date', 'Equity'], [[panel['Date'][i], res['equity_curve'][i]] for i in range(len(panel['Date']))])
        write_csv(art / f'returns_{name}.csv', ['Date', 'WeeklyReturn'], [[panel['Date'][i], res['weekly_returns'][i]] for i in range(len(panel['Date']))])
    write_csv(art / 'har_vol_forecast_us_eq.csv', ['Date', 'HAR_ForecastVol'], [[panel['Date'][i], har_forecast[i]] for i in range(len(panel['Date']))])

    write_json(art / 'ab_metrics.json', {k: v['metrics'] for k, v in results.items()})
    manifest = write_manifest(run_dir, cfg_path, data_path, cfg, results, sanity_ok, sanity_stats)
    write_five_line_summary(manifest, art / 'summary_5_lines.txt')
    print((art / 'summary_5_lines.txt').read_text(encoding='utf-8'))


if __name__ == '__main__':
    main()
