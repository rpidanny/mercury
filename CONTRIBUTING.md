# Contributing to Mercury

Thank you for your interest in contributing to Mercury! This document provides guidelines and information to help you contribute effectively.

## 🤝 How to Contribute

Contributions are welcome! Feel free to open issues or submit pull requests.

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) standards. Commit messages should be structured as follows:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

Common types include:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

This convention is enforced both locally through `commitlint` with git hooks and in the CI pipeline for PRs.

## 📂 Project Structure

Mercury consists of two main components:

```
mercury/
├── backend/          # Python FastAPI backend
├── frontend/         # React/TypeScript frontend
├── .github/          # GitHub workflows and CI configuration
├── data/             # Directory for terrain data files
├── docker-compose.yml        # Production Docker configuration
└── docker-compose.dev.yml    # Development Docker configuration
```

### Backend

The backend is built with Python using FastAPI and provides APIs for elevation data retrieval and processing.

Key directories:

- `app/` - Main application code
  - `config/` - Configuration settings
  - `routes/` - API endpoint definitions
  - `services/` - Business logic
  - `utils/` - Utility functions
- `tests/` - Test suite

For more details on the backend, see the [backend README](backend/README.md).

### Frontend

The frontend is built with React 19, TypeScript, and Three.js for 3D visualization.

Key directories:

- `src/` - Source code
  - `assets/` - Static assets
  - `components/` - Reusable UI components
  - `lib/` - Utility functions and core logic
    - `shapes/` - Shape generation logic
  - `Pages/` - Page components
  - `tests/` - Test utilities and setup

For more details on the frontend, see the [frontend README](frontend/README.md) and [frontend testing documentation](frontend/TESTING.md).

## 🧪 Testing

Both the backend and frontend include comprehensive test suites:

- **Backend**: Uses pytest for testing

  ```bash
  cd backend
  pytest
  ```

- **Frontend**: Uses Vitest and React Testing Library
  ```bash
  cd frontend
  npm test
  ```

## 🚀 Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure functionality
5. Commit your changes following the project's commit convention
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🛠️ Setting Up the Development Environment

For local development:

```bash
# Start services in development mode with hot-reloading
docker compose -f docker-compose.dev.yml up
```

This will run both the frontend and backend services with full watch mode support.

Frontend development server: http://localhost:5173
Backend API: http://localhost:8000

## 📝 Code Style

This project uses:

- **Backend**: Python with Black formatter and isort
- **Frontend**: ESLint and Prettier for JavaScript/TypeScript

Please ensure your code follows these styles before submitting PRs.
