import { expect, test, vi } from "vitest";

import { openApiDocument } from "../open-api";

vi.mock("@homarr/auth", () => ({}));

test("OpenAPI documentation should expose board automation endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.info.version).toBe("1.1.0");
  expect(document.paths).toHaveProperty("/api/boards/{id}/settings");
  expect(document.paths).toHaveProperty("/api/boards/{id}/duplicate");
  expect(document.paths).toHaveProperty("/api/boards/{id}/permissions");
  expect(document.paths).toHaveProperty("/api/boards/{entityId}/permissions/users");
  expect(document.paths).toHaveProperty("/api/boards/{entityId}/permissions/groups");
  expect(document.paths).toHaveProperty("/api/boards/{boardId}/items/{itemId}/layouts/{layoutId}");
  expect(document.paths?.["/api/boards/{id}/layouts"]).toHaveProperty("get");
  expect(document.paths?.["/api/boards/{boardId}/layouts/{layoutId}"]).toHaveProperty("patch");
  expect(document.paths).toHaveProperty("/api/settings/board");
  expect(document.paths?.["/api/boards/{id}/content"]).toHaveProperty("get");
  expect(document.paths?.["/api/boards/{boardId}/items/{itemId}"]).toHaveProperty("get");
  expect(document.paths?.["/api/boards/{boardId}/items/{itemId}"]).toHaveProperty("patch");
  expect(document.paths?.["/api/boards/{boardId}/items/{itemId}"]).toHaveProperty("delete");
});

test("OpenAPI documentation should expose user group membership endpoint", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/users/{userId}/groups");
});

test("OpenAPI documentation should expose group endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/groups");
  expect(document.paths).toHaveProperty("/api/groups/{id}");
  expect(document.paths).toHaveProperty("/api/groups/{id}/settings");
  expect(document.paths).toHaveProperty("/api/groups/positions");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/permissions");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/members");
  expect(document.paths).toHaveProperty("/api/groups/{groupId}/members/{userId}");
});

test("OpenAPI documentation should expose integration management endpoints", () => {
  const document = openApiDocument("https://homarr.dev");

  expect(document.paths).toHaveProperty("/api/integrations");
  expect(document.paths).toHaveProperty("/api/integrations/kinds");
  expect(document.paths).toHaveProperty("/api/integrations/{id}");
  expect(document.paths).toHaveProperty("/api/integrations/{id}/permissions");
  expect(document.paths).toHaveProperty("/api/integrations/{entityId}/permissions/users");
  expect(document.paths).toHaveProperty("/api/integrations/{entityId}/permissions/groups");
});
