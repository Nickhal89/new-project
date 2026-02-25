from collections import defaultdict
from datetime import datetime
from statistics import mean, pstdev
from typing import Dict, List, Optional, Tuple

from .utils import write_json

CORE = ['US_EQ', 'EU_EQ', 'JP_EQ', 'EM_EQ', 'CN_EQ', 'AGG_BOND', 'GOLD', 'DXY']


def _year(s: str) -> int:
    return datetime.strptime(s, '%Y-%m-%d').year


def _returns(vals: List[Optional[float]]) -> List[float]:
    out = []
    prev = None
    for v in vals:
        if v is None or prev in (None, 0):
            out.append(0.0)
        else:
            out.append((v / prev) - 1)
        if v is not None:
            prev = v
    return out


def _corr(a: List[float], b: List[float]) -> float:
    ma, mb = mean(a), mean(b)
    sa = (sum((x - ma) ** 2 for x in a) / max(1, len(a) - 1)) ** 0.5
    sb = (sum((x - mb) ** 2 for x in b) / max(1, len(b) - 1)) ** 0.5
    if sa == 0 or sb == 0:
        return 0.0
    cov = sum((a[i] - ma) * (b[i] - mb) for i in range(len(a))) / max(1, len(a) - 1)
    return cov / (sa * sb)


def data_quality_report(panel: Dict[str, List], meta: dict, failures: dict):
    dates = panel['Date']
    per_series = {}
    missing_year = {}
    outliers = {}

    for k, v in panel.items():
        if k == 'Date':
            continue
        present_idx = [i for i, x in enumerate(v) if x is not None]
        start = dates[present_idx[0]] if present_idx else None
        end = dates[present_idx[-1]] if present_idx else None

        ym = defaultdict(lambda: {'n': 0, 'm': 0})
        for i, d in enumerate(dates):
            y = _year(d)
            ym[y]['n'] += 1
            if v[i] is None:
                ym[y]['m'] += 1
        missing_year[k] = {str(y): (x['m'] / x['n']) for y, x in ym.items()}

        valid = [x for x in v if x is not None]
        mu = mean(valid) if valid else 0.0
        sd = pstdev(valid) if len(valid) > 2 else 1.0
        z_hits = []
        for i, x in enumerate(v):
            if x is None or sd == 0:
                continue
            z = abs((x - mu) / sd)
            if z > 8:
                z_hits.append({'date': dates[i], 'value': x, 'z': z})
        outliers[k] = z_hits

        per_series[k] = {
            'coverage_start': start,
            'coverage_end': end,
            'ffill_points': meta.get('ffill_count', {}).get(k, 0),
            'late_start_allowed': k == 'BTC',
        }

    # correlation sanity on weekly returns
    corr = {}
    core_present = [k for k in CORE if k in panel]
    core_rets = {k: _returns(panel[k]) for k in core_present}
    for i, a in enumerate(core_present):
        for b in core_present[i + 1:]:
            corr[f'{a}__{b}'] = _corr(core_rets[a], core_rets[b])

    gate_fail = []
    for c in CORE:
        if c not in panel:
            gate_fail.append(f'missing series: {c}')
            continue
        start = per_series[c]['coverage_start']
        if start is None or start > '1995-12-31':
            gate_fail.append(f'coverage starts too late: {c} start={start}')
        miss = sum(1 for x in panel[c] if x is None) / len(panel[c])
        if miss >= 0.01:
            gate_fail.append(f'missing >=1%: {c} missing={miss:.2%}')

    if failures:
        for k, vals in failures.items():
            if k in CORE:
                gate_fail.append(f'source fetch failures for {k}: {vals}')

    status = 'PASS' if not gate_fail else 'FAIL'

    report = {
        'status': status,
        'gate_fail_reasons': gate_fail,
        'series': per_series,
        'missing_pct_per_year': missing_year,
        'correlation_sanity': corr,
        'outliers_z_gt_8': outliers,
        'sources': meta.get('sources', {}),
        'attempts': dict(meta.get('attempts', {})),
        'mappings': meta.get('mappings', {}),
    }
    return report


def write_quality_reports(report: dict, json_path, md_path):
    write_json(json_path, report)
    lines = [
        '# Data Quality Report',
        f"Status: **{report['status']}**",
        '',
        '## Gate Fail Reasons',
    ]
    if report['gate_fail_reasons']:
        lines += [f"- {x}" for x in report['gate_fail_reasons']]
    else:
        lines.append('- None')
    lines += ['', '## Source Mapping']
    lines += [f"- {k}: {v}" for k, v in report['sources'].items()]
    if report.get('mappings'):
        lines += ['', '## Proxy Mappings'] + [f"- {k}: {v}" for k, v in report['mappings'].items()]
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text('\n'.join(lines), encoding='utf-8')
