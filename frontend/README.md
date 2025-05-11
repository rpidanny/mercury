# Mercury Frontend

This is the frontend application for Mercury, a tool that transforms GPX route files into stunning 3D visualizations of surrounding terrain, ready for 3D printing.

## 🚀 Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and development server
- **Three.js** - 3D visualization and model generation
- **TailwindCSS** - Styling
- **Vitest** - Testing framework
- **React Testing Library** - Component testing

## 📋 Features

- GPX file upload and parsing
- 3D terrain model generation with customizable parameters
- Support for multiple shapes (hexagon, square, circle)
- Interactive 3D preview
- Text embossing on models
- STL export for 3D printing

## 🛠️ Development Setup

### Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn

### Installation

```bash
# Install dependencies
npm ci
```

### Development Server

```bash
# Start the development server
npm run dev
```

This will start the development server at http://localhost:5173 (or another port if 5173 is in use).

### Build for Production

```bash
# Build the application
npm run build
```

The built application will be in the `dist` directory.

### Preview Production Build

```bash
# Preview the production build
npm run preview
```

## 🧪 Testing

Comprehensive testing is implemented using Vitest and React Testing Library.

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

For detailed information about testing, please refer to the [TESTING.md](./TESTING.md) file.

## 🔧 Project Structure

```
frontend/
├── public/            # Static assets
├── src/
│   ├── assets/        # Images, fonts, etc.
│   ├── components/    # Reusable UI components
│   ├── lib/           # Utility functions and core logic
│   │   └── shapes/    # Shape generation logic
│   ├── Pages/         # Page components
│   │   ├── HomePage/  # Main upload/configuration page
│   │   └── PreviewPage/ # 3D model preview page
│   ├── tests/         # Test utilities and setup
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # Application entry point
│   └── index.css      # Global styles
├── .gitignore         # Git ignore configuration
├── package.json       # Project dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── vite.config.ts     # Vite configuration
└── vitest.config.ts   # Vitest configuration
```

## 📦 Key Dependencies

- **react** & **react-dom** - Core React library
- **three.js** - 3D rendering library
- **delaunator** - Triangulation for terrain meshes
- **vite** - Fast development server and build tool
- **typescript** - Type safety
- **tailwindcss** - Utility-first CSS framework
- **vitest** - Testing framework

## 📝 Development Workflow

1. Make changes to the codebase
2. Run tests to ensure functionality
3. Use `npm run lint` to check for code style issues
4. Submit changes following the project's commit conventions

## 🔗 Related Resources

For more information about the overall Mercury project, please refer to the [main README](../README.md) in the project root.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file in the project root for details.
