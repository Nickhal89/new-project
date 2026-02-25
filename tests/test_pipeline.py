import json
import tempfile
import unittest
from pathlib import Path

from run_pipeline import sanity_gate, write_manifest

import sys
sys.path.append('project')
from src.backtest import run_backtest


class PipelineTests(unittest.TestCase):
    def test_manifest_schema_validation(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            cfg = base / 'cfg.yaml'
            cfg.write_text('step: A1\n', encoding='utf-8')
            data = base / 'weekly_data.csv'
            data.write_text('Date,US_EQ\n2020-01-03,100\n', encoding='utf-8')
            run_dir = base / 'runs' / 'RUN_X'
            (run_dir / 'artifacts').mkdir(parents=True)
            (run_dir / 'artifacts' / 'x.txt').write_text('ok', encoding='utf-8')
            c = {'_start_utc': '2026-01-01T00:00:00Z'}
            m = write_manifest(run_dir, cfg, data, c, {'A': {'metrics': {'CAGR': 0.1}}}, True, {'annualized_vol': 0.2, 'max_drawdown': -0.2})
            self.assertIn('run_id', m)
            self.assertIn('config_hash', m)
            self.assertIn('data_hash', m)
            self.assertIn('metrics', m)
            self.assertEqual(m['status'], 'PASS')

    def test_sanity_gate_validation(self):
        # deliberately high-vol and drawdown path should pass thresholds
        prices = [100, 110, 70, 95, 60, 90, 55, 88, 52, 85]
        panel = {'Date': [f'2020-01-{i+1:02d}' for i in range(len(prices))], 'US_EQ': prices}
        ok, stats = sanity_gate(panel, {'us_eq_annualized_vol_min': 0.08, 'us_eq_maxdd_max': -0.15})
        self.assertTrue(ok)
        self.assertGreater(stats['annualized_vol'], 0.08)
        self.assertLess(stats['max_drawdown'], -0.15)

    def test_lookahead_safe_backtest(self):
        # return is only on second week, should use weights[0] at t=1
        panel = {'Date': ['2020-01-03', '2020-01-10', '2020-01-17'], 'US_EQ': [100, 110, 110]}
        weights = [{'US_EQ': 1.0}, {'US_EQ': 0.0, 'CASH': 1.0}]
        out = run_backtest(panel, weights, cost_per_turnover=0.0, label='A')
        self.assertAlmostEqual(out['weekly_returns'][1], 0.10, places=8)
        self.assertAlmostEqual(out['weekly_returns'][2], 0.0, places=8)


if __name__ == '__main__':
    unittest.main()
