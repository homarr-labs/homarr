// @vitest-environment node

import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, expect, test, vi } from "vitest";

import { AxiosHttpErrorHandler, ResponseError } from "@homarr/common/server";

const logs = vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  return { debug: vi.fn() };
});
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => logs }));

beforeEach(() => {
  vi.clearAllMocks();
});

test.each([
  {
    url: "https://fixture-diag-user:fixture-diag-pass@example.com:9443/base/api?mode=queue&APIKEY=fixture-one&apikey=fixture-two&output=json#summary",
    expected: "https://example.com:9443/base/api?mode=queue&output=json#summary",
  },
  {
    url: "https://example.com/api?%61pi%6bey=fixture-key&action=status&token=fixture-token&AUTH=fixture-auth",
    expected: "https://example.com/api?action=status",
  },
  {
    url: "https://example.com/api/user/login?user=fixture-user&pass=fixture-pass&includeInfo=true",
    expected: "https://example.com/api/user/login?includeInfo=true",
  },
  {
    url: "https://example.com/rest/ping.view?u=fixture-user&p=fixture-pass&v=1.16.1&c=homarr&f=json",
    expected: "https://example.com/rest/ping.view?v=1.16.1&c=homarr&f=json",
  },
  { url: "/api?ApiKey=fixture-key&method=list&version=1", expected: "/api?method=list&version=1" },
  {
    url: "https://example.com/api?API_KEY=fixture-custom-key&action=list&output=json",
    expected: "https://example.com/api?action=list&output=json",
  },
  { url: "api?TOKEN=fixture-token&action=get", expected: "api?action=get" },
  { url: "//fixture-user:fixture-pass@example.com/api?mode=status", expected: "//example.com/api?mode=status" },
  { url: "/\\fixture-user:fixture-pass@example.com/api?apikey=fixture-key", expected: "//example.com/api" },
  {
    url: "ht\ttp://fixture-user:fixture-pass@example.com/api?mode=status",
    expected: "http://example.com/api?mode=status",
  },
  { url: "https://fixture-user:fixture-pass@bad host/api?apikey=fixture-key", expected: undefined },
])("keeps useful response diagnostics without credential authority (%#)", ({ url, expected }) => {
  const response = Object.freeze({ status: 403, url });
  const error = new ResponseError(response);
  expect(error.statusCode).toBe(403);
  expect(error.url).toBe(expected);
  expect(response.url).toBe(url);
});

test.each([undefined, "", "?", "https://example.com", "https://example.com/api?mode=queue&action=apikey&output=json"])(
  "preserves credential-free diagnostic values exactly (%s)",
  (url) => {
    expect(new ResponseError({ status: 500, url }).url).toBe(url);
  },
);

test("redacts the common handler's debug diagnostic before the response error is constructed", () => {
  const url = "https://fixture-handler-user:fixture-handler-pass@example.com/api?ApiKey=fixture-handler-key&mode=queue";
  const config = { url, method: "get", headers: new AxiosHeaders() };
  const response = { status: 401, statusText: "Unauthorized", config, headers: {}, data: null };
  const upstream = new AxiosError(
    "Request failed with status code 401",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    response,
  );
  const error = new AxiosHttpErrorHandler().handleResponseError(upstream);
  expect(error?.url).toBe("https://example.com/api?mode=queue");
  expect(logs.debug).toHaveBeenCalledWith("Received response error", {
    status: 401,
    url: "https://example.com/api?mode=queue",
    message: "Request failed with status code 401",
  });
  expect(upstream.response?.config.url).toBe(url);
});
