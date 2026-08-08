import { createServer } from "node:http";
import { errors } from "undici";
import { describe, expect, test } from "vitest";

import {
  assertJsonBudget,
  assertSafeStaticHeaders,
  classifyAddress,
  executeCustomWidgetRequest,
  resolveAndValidateHost,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "../server";
import { isCustomWidgetRequestTimeoutError } from "../server/request-executor";

describe("custom widget network policy", () => {
  test.each([
    ["8.8.8.8", "public"],
    ["10.0.0.1", "private"],
    ["127.0.0.1", "loopback"],
    ["169.254.169.254", "blocked"],
    ["224.0.0.1", "blocked"],
    ["::ffff:127.0.0.1", "blocked"],
    ["fe80::1", "blocked"],
  ] as const)("classifies %s as %s", (address, expected) => expect(classifyAddress(address)).toBe(expected));

  test("enforces configured address scopes", async () => {
    await expect(resolveAndValidateHost("10.0.0.1", "public")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(resolveAndValidateHost("10.0.0.1", "private")).resolves.toHaveLength(1);
    await expect(resolveAndValidateHost("127.0.0.1", "private")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(resolveAndValidateHost("127.0.0.1", "loopback")).resolves.toHaveLength(1);
    await expect(resolveAndValidateHost("169.254.169.254", "loopback")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("executes a DNS-pinned request within the approved scope", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":"ok"}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
        }),
      ).resolves.toMatchObject({ ok: true, status: 200, data: { status: "ok" } });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test.each([
    ["connect", new errors.ConnectTimeoutError()],
    ["headers", new errors.HeadersTimeoutError()],
    ["body", new errors.BodyTimeoutError()],
    ["generic timeout name", Object.assign(new Error("timed out"), { name: "ProxyTimeoutError" })],
  ])("recognizes %s timeout errors from the complete request lifecycle", (_label, error) => {
    expect(isCustomWidgetRequestTimeoutError(error)).toBe(true);
  });

  test("recognizes an aborted request deadline as a timeout", () => {
    const controller = new AbortController();
    controller.abort();
    expect(isCustomWidgetRequestTimeoutError(new errors.RequestAbortedError(), controller.signal)).toBe(true);
    expect(isCustomWidgetRequestTimeoutError(new Error("socket failed"))).toBe(false);
  });

  test("normalizes response-body failures after headers arrive", async () => {
    const events: Array<{ errorName: string; reason?: "timeout" }> = [];
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.flushHeaders();
      response.write('{"status":');
      setImmediate(() => response.destroy());
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
          logError: (event) => events.push(event),
        }),
      ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
      expect(events).toHaveLength(1);
      expect(events[0]?.errorName).toBe("TransportError");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("normalizes failures while draining a redirect body", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(302, { location: "/target" });
      response.flushHeaders();
      response.write("partial redirect body");
      setImmediate(() => response.destroy());
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
        }),
      ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("maps Undici's response-size failure to the domain size limit", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(`"${"x".repeat(1024 * 1024)}"`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
        }),
      ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("preserves domain errors raised while parsing the response body", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{invalid");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Upstream returned invalid JSON",
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("preserves structured bodies for GET queries", async () => {
    const server = createServer((request, response) => {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ body }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          body: '{"query":"status"}',
          networkScope: "loopback",
          kind: "query",
        }),
      ).resolves.toMatchObject({ ok: true, data: { body: '{"query":"status"}' } });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test.each([
    [301, "GET", ""],
    [302, "GET", ""],
    [303, "GET", ""],
    [307, "POST", '{"query":"status"}'],
    [308, "POST", '{"query":"status"}'],
  ] as const)("follows %i redirects with fetch-compatible method semantics", async (status, method, body) => {
    const server = createServer((request, response) => {
      if (request.url === "/start") {
        request.resume();
        response.writeHead(status, { location: "/target" });
        response.end();
        return;
      }
      let receivedBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            method: request.method,
            body: receivedBody,
            contentType: request.headers["content-type"] ?? null,
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl,
          targetUrl: `${baseUrl}/start`,
          method: "POST",
          body: '{"query":"status"}',
          networkScope: "loopback",
          kind: "query",
        }),
      ).resolves.toMatchObject({
        ok: true,
        data: {
          method,
          body,
          contentType: body ? "application/json" : null,
        },
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("does not follow redirects for actions", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(303, { location: "/target" });
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl,
          targetUrl: `${baseUrl}/start`,
          method: "POST",
          networkScope: "loopback",
          kind: "action",
        }),
      ).rejects.toThrow("redirect limit");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("allows only credential-free HTTP(S) URLs without fragments", () => {
    expect(validateCustomWidgetUrl("https://example.com/api").href).toBe("https://example.com/api");
    expect(() => validateCustomWidgetUrl("file:///etc/passwd")).toThrow("HTTP and HTTPS");
    expect(() => validateCustomWidgetUrl("https://user:password@example.com/api")).toThrow("credentials");
    expect(() => validateCustomWidgetUrl("https://example.com/api#secret")).toThrow("fragments");
  });

  test("rejects cross-origin targets and reserved headers", () => {
    expect(resolveSameOriginTarget("https://example.com/base", "https://example.com/status").pathname).toBe("/status");
    expect(() => resolveSameOriginTarget("https://example.com", "https://attacker.example")).toThrow("origin");
    for (const header of [
      "Authorization",
      "Cookie",
      "Host",
      "Proxy-Authorization",
      "Sec-Fetch-Site",
      "X-Forwarded-For",
    ]) {
      expect(() => assertSafeStaticHeaders({ [header]: "value" })).toThrow("reserved");
    }
  });

  test("rejects response JSON beyond the depth budget", () => {
    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let index = 0; index < 40; index += 1) {
      nested.child = {};
      nested = nested.child as Record<string, unknown>;
    }
    expect(() => assertJsonBudget(root)).toThrow("deeply nested");
  });
});
