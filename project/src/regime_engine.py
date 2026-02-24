from typing import Dict, List


def infer_regime(features: Dict[str, Dict[str, List[float]]]) -> List[str]:
    # Proxy risk regime using equity basket momentum + credit risk proxy
    eq = ['^GSPC', 'VGK', 'EWJ', 'EEM', 'FXI']
    length = len(next(iter(features.values()))['returns'])
    regime = []
    for i in range(length):
        eq_mom = sum(features[s]['returns'][i] for s in eq if s in features) / len(eq)
        hyg = features.get('HYG', {'returns': [0]*length})['returns'][i]
        v = sum(features[s]['vol_26w'][i] for s in eq if s in features) / len(eq)
        if eq_mom > 0 and hyg > -0.01 and v < 0.05:
            regime.append('RISK_ON')
        elif eq_mom < -0.005 or hyg < -0.02 or v > 0.08:
            regime.append('RISK_OFF')
        else:
            regime.append('NEUTRAL')
    return regime
