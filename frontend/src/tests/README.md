# Frontend Tests

This directory contains tests for the Mercury frontend application.

## Test Structure

The tests are organized following a similar structure to the application code:

- Component tests are located next to the component files with `.test.tsx` extensions
- Utility module tests are located next to the module files with `.test.ts` extensions
- Common testing utilities are in the `tests/test-utils.tsx` file
- Test setup configuration is in the `tests/setup.ts` file

## Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (recommended during development):

```bash
npm test -- --watch
```

To run tests with coverage:

```bash
npm test -- --coverage
```

To run a specific test file:

```bash
npm test -- src/components/LoadingModal.test.tsx
```

## Adding New Tests

### For Components

1. Create a new file next to the component with the `.test.tsx` extension
2. Import the component and testing utilities
3. Write tests for the component's functionality
4. Use the format demonstrated in existing component tests

Example:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "../tests/test-utils";
import YourComponent from "./YourComponent";

describe("YourComponent", () => {
  it("renders correctly", () => {
    render(<YourComponent />);
    expect(screen.getByText("Your Text")).toBeInTheDocument();
  });
});
```

### For Utility Modules

1. Create a new file next to the module with the `.test.ts` extension
2. Mock any external dependencies
3. Test individual functions and cases

Example:

```ts
import { describe, it, expect, vi } from "vitest";
import YourModule from "./YourModule";

describe("YourModule", () => {
  it("calculates correctly", () => {
    const result = YourModule.calculate(10);
    expect(result).toBe(20);
  });
});
```

## Testing Guidelines

1. Keep tests simple and focused on a single behavior
2. Use clear and descriptive test names
3. Group related tests using `describe` blocks
4. Minimize duplicated code with test utilities and helper functions
5. Mock external dependencies and side effects
6. Prefer testing user interactions and outcomes over implementation details
