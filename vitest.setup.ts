import { vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("server-only", () => ({ default: undefined }));
