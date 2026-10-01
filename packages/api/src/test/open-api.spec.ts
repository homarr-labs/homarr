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

  expect(document.info.version).toBe("1.2.0");
  expect(document.paths).toHaveProperty("/api/boards/{id}/settings");
  expect(document.paths).toHaveProperty("/api/boards/{id}/duplicate");
  expect(document.paths).toHaveProperty("/api/settings/board");
});

test("OpenAPI documentation should expose board composition endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/boards/{id}");
  expect(document.paths).toHaveProperty("/api/boards/{id}/items");
  expect(document.paths).toHaveProperty("/api/boards/{id}/sections");
  expect(document.paths).toHaveProperty("/api/boards/{id}/layouts");
  expect(document.paths).toHaveProperty("/api/boards/{id}/export");
  expect(document.paths).toHaveProperty("/api/boards/import");
  expect(document.paths).toHaveProperty("/api/boards/{boardId}/items/{itemId}");
  expect(document.paths).toHaveProperty("/api/boards/{boardId}/sections/{sectionId}");
  expect(document.paths).toHaveProperty("/api/boards/{id}/permissions");
  expect(document.paths).toHaveProperty("/api/boards/{entityId}/permissions/users");
  expect(document.paths).toHaveProperty("/api/boards/{entityId}/permissions/groups");
});

test("OpenAPI documentation should expose the configuration endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/config/export");
  expect(document.paths).toHaveProperty("/api/config/import");
});

test("OpenAPI documentation should allow placing items with an explicit size", () => {
  const document = openApiDocument("https://homarr.dev");

  const requestBody = document.paths?.["/api/boards/items"]?.post?.requestBody as
    | { content: { "application/json": { schema: { properties: Record<string, unknown> } } } }
    | undefined;
  const properties = requestBody?.content["application/json"].schema.properties;

  expect(properties).toBeDefined();
  expect(properties).toHaveProperty("width");
  expect(properties).toHaveProperty("height");
  expect(properties).toHaveProperty("xOffset");
  expect(properties).toHaveProperty("yOffset");
  expect(properties).toHaveProperty("sectionId");
  expect(properties).toHaveProperty("layouts");
});

test("OpenAPI documentation should expose the remaining service endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/search-engines");
  expect(document.paths).toHaveProperty("/api/search-engines/{id}");
  expect(document.paths).toHaveProperty("/api/integrations");
  expect(document.paths).toHaveProperty("/api/integrations/{id}");
  expect(document.paths).toHaveProperty("/api/integration-kinds");
  expect(document.paths).toHaveProperty("/api/groups");
  expect(document.paths).toHaveProperty("/api/groups/{id}");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/members");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/members/{userId}");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/permissions");
  expect(document.paths).toHaveProperty("/api/apikeys");
  expect(document.paths).toHaveProperty("/api/apikeys/{apiKeyId}");
  expect(document.paths).toHaveProperty("/api/settings");
});
