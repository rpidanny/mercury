"""
Configuration for the ALOS DSM API.
"""

from dotenv import load_dotenv
import os

load_dotenv()

ALOS_DATA_PATH = os.environ.get(
    "ALOS_DSM_PATH", "/Users/abhishek.maharjan/Downloads/geotiffs/geo_AW3D30.vrt"
)
