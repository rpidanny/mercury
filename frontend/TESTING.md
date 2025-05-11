# Mercury Frontend Testing Guide

## Overview

The Mercury frontend application now includes a comprehensive testing suite using Vitest and React Testing Library. This document provides an overview of the testing implementation, how to run tests, and key considerations for working with the tests.

## Testing Framework

- **Vitest**: A fast Vite-native testing framework (compatible with Jest API)
- **React Testing Library**: For testing React components
- **JSDOM**: Simulates a browser environment in Node.js

## Test Directory Structure

- Component tests (`.test.tsx` files): Located next to their respective components
- Utility module tests (`.test.ts` files): Located next to their respective modules
- Test setup: `src/tests/setup.ts`
- Test utilities: `src/tests/test-utils.tsx`

## Running Tests

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

## Test Status

| Component/Module | Status  | Notes                               |
| ---------------- | ------- | ----------------------------------- |
| LoadingModal     | ✅ Pass | All tests pass                      |
| HomePage         | ✅ Pass | All tests pass                      |
| PreviewPage      | ✅ Pass | All tests pass                      |
| App              | ✅ Pass | Basic functionality tests pass      |
| GPXParser        | ✅ Pass | All tests pass                      |
| TerrainGenerator | ✅ Pass | All tests pass                      |
| ModelBuilder     | ✅ Pass | All tests pass with mocked THREE.js |

## Special Testing Considerations

### 1. THREE.js Mocking

THREE.js requires extensive mocking for unit tests. Always use the comprehensive mocking approach:

```typescript
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual, // Include all original exports
    // Override specific classes with mocks
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      children: [],
      background: null,
    })),
    Color: vi.fn().mockImplementation(() => ({ r: 0, g: 0, b: 0 })),
    // Add other mocked classes as needed
  };
});
```

### 2. File Handling in Tests

When testing components that handle file uploads (like GPX files), create a custom File class with the text method:

```typescript
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }

  text(): Promise<string> {
    return Promise.resolve(`<?xml version="1.0"?><gpx>...</gpx>`);
  }
}

// Then use in tests
const mockFile = new MockFile(["content"], "file.gpx", {
  type: "application/gpx+xml",
});
```

### 3. Asynchronous Tests

For components that trigger async operations:

1. Use proper async/await patterns
2. Consider using simple assertions rather than checking specific UI elements when testing complex flows
3. Mock all async operations to complete immediately in tests
4. Handle Promise rejections properly when testing error cases

## Testing Components with User Interactions

For testing components with user interactions, use the following pattern:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("handles user interaction", async () => {
  render(<MyComponent />);

  // Find elements
  const button = screen.getByRole("button", { name: /submit/i });

  // Interact with elements
  await userEvent.click(button);

  // Assert expected outcomes
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

## Mocking API Calls

For modules that make API calls, use vi.mock and mock implementations:

```typescript
vi.mock("./api", () => ({
  default: {
    fetchData: vi.fn().mockResolvedValue({ data: "mocked data" }),
  },
}));

// Reset in beforeEach
beforeEach(() => {
  vi.mocked(api.fetchData).mockReset();
});
```

## Best Practices

1. Test behavior, not implementation
2. Write small, focused tests
3. Use meaningful test descriptions
4. Use arrange-act-assert pattern
5. Mock external dependencies
6. Use test cleanup to prevent test pollution
7. Check accessibility where relevant
8. Always use proper TypeScript types in mock implementations
9. Restore original implementations after tests when using dynamic imports
10. For complex components that are difficult to unit test (like 3D visualization), focus on testing core functionality rather than detailed rendering

## Future Testing Improvements

To further improve test coverage:

1. Add additional edge case testing for form validation
2. Add integration tests for the model generation workflow
3. Add visual regression tests for UI components
4. Implement full end-to-end tests for the complete application flow
5. Add tests for performance-critical code paths
