import { expect, test, vi } from "vitest";

import { openApiDocument } from "../open-api";

vi.mock("@homarr/auth", () => ({}));

test("OpenAPI documentation should be generated", () => {
  // Arrange
  const base = "https://homarr.dev";

  // Act
  const act = () => openApiDocument(base);

  // Assert
  expect(act).not.toThrow();
});

test("OpenAPI documentation should expose board automation endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.info.version).toBe("1.1.0");
  expect(document.paths).toHaveProperty("/api/boards/{id}/settings");
  expect(document.paths).toHaveProperty("/api/boards/{id}/duplicate");
  expect(document.paths).toHaveProperty("/api/settings/board");
});
