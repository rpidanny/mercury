import pytest
from app.utils.geometry import linspace


def test_linspace_normal_case():
    """Test linspace with normal input values."""
    # Test with 5 points between 0 and 1
    result = linspace(0, 1, 5)
    expected = [0.0, 0.25, 0.5, 0.75, 1.0]
    assert len(result) == 5
    assert all(abs(a - b) < 1e-10 for a, b in zip(result, expected))

    # Test with 3 points between -10 and 10
    result = linspace(-10, 10, 3)
    expected = [-10.0, 0.0, 10.0]
    assert len(result) == 3
    assert all(abs(a - b) < 1e-10 for a, b in zip(result, expected))


def test_linspace_single_point():
    """Test linspace with num=1 (should return middle point)."""
    result = linspace(0, 10, 1)
    expected = [5.0]
    assert len(result) == 1
    assert abs(result[0] - expected[0]) < 1e-10

    result = linspace(-5, 5, 1)
    expected = [0.0]
    assert len(result) == 1
    assert abs(result[0] - expected[0]) < 1e-10


def test_linspace_zero_points():
    """Test linspace with num=0 (should still return middle point)."""
    result = linspace(0, 10, 0)
    expected = [5.0]
    assert len(result) == 1
    assert abs(result[0] - expected[0]) < 1e-10


def test_linspace_negative_points():
    """Test linspace with negative num (should still return middle point)."""
    result = linspace(0, 10, -2)
    expected = [5.0]
    assert len(result) == 1
    assert abs(result[0] - expected[0]) < 1e-10


def test_linspace_equal_endpoints():
    """Test linspace with start=stop."""
    result = linspace(5, 5, 5)
    expected = [5.0, 5.0, 5.0, 5.0, 5.0]
    assert len(result) == 5
    assert all(abs(a - b) < 1e-10 for a, b in zip(result, expected))


def test_linspace_even_spacing():
    """Test that linspace produces evenly spaced points."""
    result = linspace(0, 1, 5)

    # Calculate differences between consecutive elements
    diffs = [result[i + 1] - result[i] for i in range(len(result) - 1)]

    # All differences should be approximately equal
    first_diff = diffs[0]
    assert all(abs(diff - first_diff) < 1e-10 for diff in diffs)
