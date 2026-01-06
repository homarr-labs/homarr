import { vi } from "vitest";

vi.mock("server-only", () => ({ default: undefined }));

// Set required environment variable for encryption module
process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);
