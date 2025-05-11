import os
import pytest
import sys
from app.config.config import Config


@pytest.fixture
def mock_env_for_tests(monkeypatch, test_data_path):
    """Set up environment variables for tests and mock os.path.exists."""
    monkeypatch.setenv("ALOS_DSM_PATH", test_data_path)
    # Use the real test_data_path which we know exists
    return test_data_path


def test_config_loads_from_env(mock_env_for_tests):
    """Test that configuration loads environment variables."""
    # Create a new config instance with the mocked environment
    config = Config()

    # Check that the path was loaded correctly
    assert config.alos_data_path == mock_env_for_tests


def test_alos_data_path_missing(monkeypatch):
    """Test that error is raised when ALOS_DSM_PATH is missing."""
    # Ensure the environment variable is removed
    monkeypatch.delenv("ALOS_DSM_PATH", raising=False)

    # Check that initialization fails
    with pytest.raises(
        ValueError, match="ALOS_DSM_PATH environment variable is required"
    ):
        Config()


def test_alos_data_path_file_not_found(monkeypatch):
    """Test that error is raised when ALOS_DSM_PATH points to non-existent file."""
    # Set to a path that definitely doesn't exist
    non_existent_path = "/definitely/not/a/real/path/file.tif"
    monkeypatch.setenv("ALOS_DSM_PATH", non_existent_path)

    # Check that initialization fails
    with pytest.raises(ValueError, match="ALOS DSM data file not found at:"):
        Config()


def test_debug_setting(mock_env_for_tests, monkeypatch):
    """Test that debug setting is properly parsed from environment."""
    # Test true values
    for true_value in ["true", "True", "1", "t", "T"]:
        monkeypatch.setenv("DEBUG", true_value)
        assert Config().debug is True

    # Test false values
    for false_value in ["false", "False", "0", "f", "F", "random"]:
        monkeypatch.setenv("DEBUG", false_value)
        assert Config().debug is False


def test_port_setting(mock_env_for_tests, monkeypatch):
    """Test that port setting is properly parsed from environment."""
    # Test port value
    monkeypatch.setenv("PORT", "5000")
    assert Config().port == 5000

    # Test default port
    monkeypatch.delenv("PORT", raising=False)
    assert Config().port == 8000


def test_log_level_validation(mock_env_for_tests, monkeypatch):
    """Test that log level validation works."""
    # Test valid log levels
    for valid_level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        monkeypatch.setenv("LOG_LEVEL", valid_level)
        assert Config().log_level == valid_level

    # Test invalid log level
    monkeypatch.setenv("LOG_LEVEL", "INVALID")
    with pytest.raises(ValueError):
        Config()
