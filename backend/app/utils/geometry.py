"""
Geometry utility functions.
"""


def linspace(start: float, stop: float, num: int) -> list[float]:
    """Generate `num` evenly spaced values between `start` and `stop` inclusive."""
    if num <= 1:
        return [(start + stop) / 2.0]
    step = (stop - start) / (num - 1)
    return [start + i * step for i in range(num)]
