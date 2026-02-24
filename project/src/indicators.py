from typing import Dict, List


def returns(series: List[float]) -> List[float]:
    out = [0.0]
    for i in range(1, len(series)):
        prev = series[i - 1] if series[i - 1] != 0 else 1e-9
        out.append((series[i] / prev) - 1)
    return out


def rolling_vol(ret: List[float], window: int = 26) -> List[float]:
    out = []
    for i in range(len(ret)):
        s = ret[max(0, i - window + 1): i + 1]
        mean = sum(s) / len(s)
        var = sum((x - mean) ** 2 for x in s) / max(1, len(s) - 1)
        out.append(var ** 0.5)
    return out


def compute_feature_table(panel: Dict[str, List[float]]) -> Dict[str, Dict[str, List[float]]]:
    feats = {}
    for k, v in panel.items():
        if k == 'Date':
            continue
        r = returns(v)
        feats[k] = {'returns': r, 'vol_26w': rolling_vol(r, 26)}
    return feats
