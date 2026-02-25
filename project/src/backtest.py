# Updated backtest.py to ensure weight keys match panel asset names exactly

# Assuming this is part of a larger backtesting framework, the following ensures the weight keys match the required format.
def validate_weights(weights):
    # Required asset names
    asset_names = {"AGG_BOND", "HY_PROXY", "COMMOD"}

    # Validate weights against the asset names
    for key in weights.keys():
        if key not in asset_names:
            raise ValueError(f"Weight key '{key}' does not match any asset name.")
    print("All weight keys are valid and match the asset names.")

# Example usage
weights_example = {"AGG_BOND": 0.4, "HY_PROXY": 0.3, "COMMOD": 0.3}
validate_weights(weights_example)

