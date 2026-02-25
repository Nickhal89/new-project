def run_ab(dates, panel, regimes, drawdowns, weekly_returns_proxy):
    # Existing code...
    # Fix determine_weights call with all required arguments
    weights = determine_weights(dates, panel, regimes, drawdowns, weekly_returns_proxy)
    # Continue with existing code...

# Existing code...

dependency_installer_timeout = 120  # Increased timeout from 20 to 120 seconds

# Existing code...

# Save weekly_data.csv to both directories
import shutil

shutil.copy('weekly_data.csv', 'project/data/weekly_data.csv')
shutil.copy('weekly_data.csv', 'runs/{run_id}/weekly_data.csv')
