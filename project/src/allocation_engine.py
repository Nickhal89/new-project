from typing import Dict


RISK_ON = {'^GSPC': 0.22, 'VGK': 0.1, 'EWJ': 0.08, 'EEM': 0.08, 'FXI': 0.06, 'VNQ': 0.1, 'DBC': 0.08, 'GLD': 0.08, 'AGG': 0.1, 'HYG': 0.07, 'BTC-USD': 0.03}
NEUTRAL = {'^GSPC': 0.16, 'VGK': 0.08, 'EWJ': 0.07, 'EEM': 0.06, 'FXI': 0.05, 'VNQ': 0.08, 'DBC': 0.07, 'GLD': 0.12, 'AGG': 0.18, 'HYG': 0.1, 'BTC-USD': 0.03}
RISK_OFF = {'^GSPC': 0.08, 'VGK': 0.04, 'EWJ': 0.04, 'EEM': 0.03, 'FXI': 0.02, 'VNQ': 0.05, 'DBC': 0.04, 'GLD': 0.2, 'AGG': 0.4, 'HYG': 0.08, 'BTC-USD': 0.02}


def target_weights(regime: str) -> Dict[str, float]:
    mapping = {'RISK_ON': RISK_ON, 'NEUTRAL': NEUTRAL, 'RISK_OFF': RISK_OFF}
    return mapping.get(regime, NEUTRAL)
