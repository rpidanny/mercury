import os
from app.config import ALOS_DATA_PATH


def test_config_loads_from_env():
    """Test that configuration loads environment variables."""
    # Set a test path
    test_path = "/test/path/to/data.tif"
    original_path = os.environ.get("ALOS_DSM_PATH")

    try:
        os.environ["ALOS_DSM_PATH"] = test_path

        # Import again to reload the module
        import importlib
        import app.config

        importlib.reload(app.config)

        # Check that the path was updated
        assert app.config.ALOS_DATA_PATH == test_path
    finally:
        # Restore original environment
        if original_path is not None:
            os.environ["ALOS_DSM_PATH"] = original_path
        else:
            os.environ.pop("ALOS_DSM_PATH", None)
