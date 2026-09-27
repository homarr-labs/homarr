import assert from "node:assert/strict";
import { createServer } from "node:http";

export interface HttpRoute {
  method: string;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  response: {
    status?: number;
    body: unknown;
    headers?: Record<string, string>;
  };
}

/** A real HTTP peer with an independently checked protocol transcript. */
export async function startHttpService(routes: HttpRoute[]) {
  const pending = [...routes];
  const failures: string[] = [];
  let active = 0;
  let onSettled: (() => void) | undefined;
  const server = createServer(async (request, response) => {
    active++;
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const index = pending.findIndex((route) => route.method === request.method && route.path === url.pathname);
      assert.notEqual(index, -1, `Unexpected ${request.method} ${url.pathname}`);
      const route = pending.splice(index, 1)[0];
      assert.ok(route);
      for (const [name, value] of Object.entries(route.headers ?? {})) {
        // Do not put credential values into assertion output or CI artifacts.
        assert.ok(request.headers[name.toLowerCase()] === value, `Incorrect request header: ${name}`);
      }
      if (route.query) {
        assert.deepEqual(Object.fromEntries(url.searchParams), route.query, "Incorrect request query");
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (route.body !== undefined) {
        const body = Buffer.concat(chunks).toString("utf8");
        if (typeof route.body === "string") {
          assert.ok(body === route.body, "Incorrect request body");
        } else {
          assert.deepEqual(JSON.parse(body), route.body, "Incorrect JSON request body");
        }
      }
      response.statusCode = route.response.status ?? 200;
      response.setHeader("content-type", "application/json");
      for (const [name, value] of Object.entries(route.response.headers ?? {})) response.setHeader(name, value);
      if (typeof route.response.body === "string") {
        response.end(route.response.body);
      } else {
        response.end(JSON.stringify(route.response.body));
      }
    } catch (error) {
      failures.push(String(error));
      response.statusCode = 500;
      response.end("Protocol fixture rejected the request");
    } finally {
      active--;
      if (pending.length === 0 && active === 0) onSettled?.();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    async assertComplete() {
      // Promise.all may reject while sibling HTTP requests are still in flight.
      // Wait for the transcript to settle; missing requests still fail after the deadline.
      if (pending.length > 0 || active > 0) {
        await new Promise<void>((resolve) => {
          const deadline = setTimeout(resolve, 2_000);
          onSettled = () => {
            clearTimeout(deadline);
            resolve();
          };
        });
        onSettled = undefined;
      }
      assert.deepEqual(failures, [], "The upstream fixture saw invalid requests");
      assert.deepEqual(
        pending.map(({ method, path }) => `${method} ${path}`),
        [],
        "Missing upstream requests",
      );
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    },
  };
}
