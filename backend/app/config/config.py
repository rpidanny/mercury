"""
Configuration for the ALOS DSM API.
"""

import os
import sys
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import ClassVar, Optional, Any


class Config(BaseModel):
    """
    Application settings with validation.
    """

    # Data path settings
    alos_data_path: str

    # Application settings
    debug: bool = Field(
        default_factory=lambda: os.environ.get("DEBUG", "False").lower()
        in ("true", "1", "t"),
        description="Debug mode",
    )

    # Server settings
    host: str = Field(
        default_factory=lambda: os.environ.get("HOST", "0.0.0.0"),
        description="Host to run the server on",
    )
    port: int = Field(
        default_factory=lambda: int(os.environ.get("PORT", "8000")),
        description="Port to run the server on",
    )

    # Logging settings
    log_level: str = Field(
        default_factory=lambda: os.environ.get("LOG_LEVEL", "INFO"),
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    @model_validator(mode="before")
    @classmethod
    def set_alos_data_path_from_env(cls, data: dict) -> dict:
        """Set alos_data_path from environment variable if not provided."""
        if isinstance(data, dict) and "alos_data_path" not in data:
            env_path = os.environ.get("ALOS_DSM_PATH")
            if not env_path:
                raise ValueError("ALOS_DSM_PATH environment variable is required")
            data["alos_data_path"] = env_path
        return data

    @field_validator("alos_data_path")
    @classmethod
    def validate_alos_data_path(cls, v: str) -> str:
        """
        Validate that the ALOS data path exists.
        Raises a ValueError if the path does not exist.
        """
        if not v:
            raise ValueError("ALOS_DSM_PATH cannot be empty")

        if not os.path.exists(v):
            raise ValueError(f"ALOS DSM data file not found at: {v}")

        return v

    @model_validator(mode="after")
    def validate_log_level(self) -> "Config":
        """Validate log level is a proper logging level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if self.log_level.upper() not in valid_levels:
            raise ValueError(
                f"Invalid log level: {self.log_level}. Must be one of {valid_levels}"
            )
        self.log_level = self.log_level.upper()
        return self
