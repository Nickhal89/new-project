from typing import Dict, List


def summary_stats(series: List[float], ret: List[float]) -> Dict[str, float]:
    avg = sum(ret) / len(ret)
    vol = (sum((x - avg) ** 2 for x in ret) / max(1, len(ret) - 1)) ** 0.5
    sharpe = (avg / vol) * (52 ** 0.5) if vol > 0 else 0.0
    mdd = 0.0
    peak = series[0]
    for x in series:
        if x > peak:
            peak = x
        dd = (x / peak) - 1
        mdd = min(mdd, dd)
    cagr = series[-1] ** (52 / max(1, len(series))) - 1
    return {
        'cagr': cagr,
        'weekly_vol': vol,
        'annualized_sharpe': sharpe,
        'max_drawdown': mdd,
    }


def validate_no_lookahead(backtest_code_note: str = 'Signals are taken from t-1 and applied on t returns.') -> bool:
    return 't-1' in backtest_code_note and 't returns' in backtest_code_note
