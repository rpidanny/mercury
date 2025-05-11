import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Import jest-dom directly
import "@testing-library/jest-dom";

// Clean up after each test
afterEach(() => {
  cleanup();
});
