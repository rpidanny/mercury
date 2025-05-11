# Mercury Backend

The backend service for the Mercury application, providing elevation data APIs.

## Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Set environment variables:

   ```bash
   export ALOS_DSM_PATH=/path/to/your/elevation/data.vrt
   ```

3. Run the development server:
   ```bash
   python -m app.app
   ```

## Running Tests

The backend includes a comprehensive test suite using pytest:

```bash
# Run all tests
pytest

# Run tests with coverage report
pytest --cov=app

# Run specific test file
pytest tests/test_app.py

# Run tests with verbose output
pytest -v
```

## API Endpoints

- `GET /version` - Returns the application version
- `POST /api/v1/lookup` - Look up elevations at specific locations
- `POST /api/v1/grid` - Generate elevation grid within specified bounds
