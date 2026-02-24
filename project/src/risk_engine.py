from typing import Dict


def cap_weights(weights: Dict[str, float], max_weight: float = 0.4) -> Dict[str, float]:
    capped = {k: min(v, max_weight) for k, v in weights.items()}
    total = sum(capped.values())
    return {k: v / total for k, v in capped.items()}


def turnover(prev: Dict[str, float], new: Dict[str, float]) -> float:
    keys = set(prev) | set(new)
    return 0.5 * sum(abs(prev.get(k, 0) - new.get(k, 0)) for k in keys)
