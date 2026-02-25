# Updated allocation_engine.py to fix clamping, asset allocation, and key consistency

def allocate_assets(def_budget, available_assets, panel, asset_allocations):
    # Clamp defensive budget to non-negative
    def_budget = max(0, min(0.60, 1 - rb))

    for asset in available_assets:
        if asset in panel:
            # Proceed with allocation if asset is available
            asset_allocations[asset] = def_budget / len(available_assets)

    # Ensure original keys are consistent with backtest
    for key in ['AGG_BOND', 'HY_PROXY', 'COMMOD']:
        if key not in asset_allocations:
            asset_allocations[key] = 0

    return asset_allocations
