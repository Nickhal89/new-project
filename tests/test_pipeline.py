import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from run_pipeline import REQUIRED_MANIFEST_KEYS, load_simple_yaml, resolve_tx_cost, sanity_gate


class PipelineTests(unittest.TestCase):
    def _write_fixture_csv(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        # real-like volatile data, no synthetic fallback logic in app
        prices = [100, 102, 98, 105, 95, 110, 90, 108, 85, 112, 80, 115, 78, 117, 76, 120, 75, 121, 74, 122]
        with path.open('w', encoding='utf-8') as f:
            f.write('Date,US_EQ,EU_EQ,JP_EQ,EM_EQ,CN_EQ,BONDS,HY,GOLD,COMMS,REIT,BTC\n')
            for i, p in enumerate(prices):
                d = f"2020-01-{(i%28)+1:02d}"
                row = [d, p, p*0.9, p*0.85, p*0.8, p*0.75, 100+i*0.2, 90+i*0.3, 120+i*0.1, 80+i*0.15, 70+i*0.1, 50+i*0.5]
                f.write(','.join(str(x) for x in row) + '\n')

    def test_sanity_gate_validation(self):
        panel = {'Date': ['2020-01-03', '2020-01-10', '2020-01-17', '2020-01-24'], 'US_EQ': [100, 120, 70, 110]}
        ok, stats = sanity_gate(panel, {'us_eq_annualized_vol_min': 0.08, 'us_eq_maxdd_max': -0.15})
        self.assertTrue(ok)
        self.assertGreater(stats['annualized_vol'], 0.08)
        self.assertLess(stats['max_drawdown'], -0.15)

    def test_resolve_tx_cost_accepts_transaction_cost_alias(self):
        self.assertAlmostEqual(resolve_tx_cost({'tx_cost_bps': 10}), 0.001)
        self.assertAlmostEqual(resolve_tx_cost({'transaction_cost': 0.001}), 0.001)

    def test_a2_config_uses_allocator_overlay_schema(self):
        repo = Path(__file__).resolve().parents[1]
        cfg = load_simple_yaml(repo / 'configs' / 'A2.yaml')
        overlay = cfg['overlay_params']
        self.assertIn('corr_z_threshold', overlay['corr_shock'])
        self.assertNotIn('threshold', overlay['corr_shock'])
        self.assertIn('tail_safety', overlay)
        self.assertNotIn('tail_risk', overlay)

    def test_run_pipeline_produces_manifest(self):
        repo = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as td:
            wd = Path(td)
            csv_path = wd / 'weekly_data.csv'
            self._write_fixture_csv(csv_path)

            cfg = wd / 'cfg.yaml'
            cfg.write_text(
                '\n'.join([
                    'step: T1',
                    f'source_weekly_data_path: {csv_path}',
                    'transaction_cost: 0.001',
                    'rebalance_freq: monthly',
                    'variants:',
                    '  - name: A',
                    '    mode: baseline',
                    '  - name: B',
                    '    mode: har',
                    '  - name: C',
                    '    mode: har_corr_tail',
                    'overlay_params:',
                    '  har:',
                    '    enabled: true',
                    '    rolling_weeks: 20',
                    '    min_fit: 10',
                    '    refit_every_weeks: 4',
                    '    clip_min: 0.50',
                    '    clip_max: 1.25',
                    '  corr_shock:',
                    '    enabled: true',
                    '    corr_z_threshold: 0.0',
                    '    scale: 0.9',
                    '  tail_safety:',
                    '    enabled: true',
                    '    es95_threshold: -0.001',
                    '    scale: 0.9',
                    'sanity_thresholds:',
                    '  us_eq_annualized_vol_min: 0.08',
                    '  us_eq_maxdd_max: -0.15',
                ]),
                encoding='utf-8'
            )

            before = set((repo / 'runs').glob('RUN_T1_*'))
            proc = subprocess.run(['python3', str(repo / 'run_pipeline.py'), '--config', str(cfg)], cwd=repo, capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, msg=proc.stderr + '\n' + proc.stdout)

            after = set((repo / 'runs').glob('RUN_T1_*'))
            created = sorted(after - before)
            self.assertTrue(created)
            manifest_path = created[-1] / 'manifest.json'
            self.assertTrue(manifest_path.exists())
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            self.assertTrue(REQUIRED_MANIFEST_KEYS.issubset(set(manifest.keys())))
            self.assertTrue(manifest['lookahead_safe_check'])


if __name__ == '__main__':
    unittest.main()
