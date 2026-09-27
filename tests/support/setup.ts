import { vi } from "vitest";

// Next's import marker has no runtime behavior outside the application bundler.
vi.mock("server-only", () => ({}));
