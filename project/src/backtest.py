from typing import Dict, List
from .allocation_engine import target_weights
from .risk_engine import cap_weights, turnover


def run_backtest(panel: Dict[str, List[float]], features: Dict[str, Dict[str, List[float]]], regimes: List[str]):
    n = len(panel['Date'])
    value = [1.0]
    rets = []
    prev_w = {}
    tovs = []

    tradables = [k for k in panel.keys() if k not in ('Date', 'DX-Y.NYB')]
    for i in range(1, n):
        w = cap_weights(target_weights(regimes[i - 1]))
        port_ret = 0.0
        for k in tradables:
            if k in w:
                port_ret += w[k] * features[k]['returns'][i]  # t-1 signal, t return => no lookahead
        tx_cost = turnover(prev_w, w) * 0.0005
        net = port_ret - tx_cost
        rets.append(net)
        value.append(value[-1] * (1 + net))
        tovs.append(turnover(prev_w, w))
        prev_w = w

    return {'equity_curve': value, 'weekly_returns': [0.0] + rets, 'turnover': [0.0] + tovs}
