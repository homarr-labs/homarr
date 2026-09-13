import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod/v4";

import type { CustomWidgetArtifact } from "./artifact";
import { assertWidgetArtifactIntegrity } from "./integrity";
import { WidgetRunnerStreams } from "./runner-streams";
import { CustomWidgetPackageSupervisor } from "./supervisor";

const invocationSchema = z.object({
  handler: z.string().min(1).max(128),
  input: z.unknown().default({}),
  instanceId: z.string().min(1).max(128),
  boardId: z.string().min(1).max(128),
  userId: z.string().max(128).optional(),
});
const streamSchema = z.object({ id: z.string().uuid() });

export interface WidgetRunnerOptions {
  artifact: CustomWidgetArtifact;
  rootDirectory: string;
  token: string;
  host?: string;
  port?: number;
  log?(message: string): void;
}

/** A trusted remote execution location. This is not a sandbox and exposes no package upload endpoint. */
export async function startWidgetPackageRunner(options: WidgetRunnerOptions) {
  if (options.token.length < 32) throw new Error("Runner tokens must contain at least 32 characters");
  const artifact = assertWidgetArtifactIntegrity(options.artifact);
  const supervisor = new CustomWidgetPackageSupervisor({ rootDirectory: options.rootDirectory, log: options.log });
  try {
    await supervisor.preflight({ artifact });
  } catch (error) {
    await supervisor.shutdown();
    throw error;
  }
  const streams = new WidgetRunnerStreams();
  const expected = Buffer.from(`Bearer ${options.token}`);
  const server = createServer({ requestTimeout: 30_000, headersTimeout: 10_000 }, (request, response) => {
    void handle(request, response).catch((error: unknown) => {
      if (response.destroyed) return;
      response.statusCode = 400;
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Runner request failed" }));
    });
  });

  async function handle(request: IncomingMessage, response: ServerResponse) {
    response.setHeader("content-type", "application/json");
    response.setHeader("cache-control", "no-store");
    const authorization = Buffer.from(request.headers.authorization ?? "");
    if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: "Runner authentication required" }));
      return;
    }
    if (request.method === "GET" && request.url === "/health") {
      response.end(
        JSON.stringify({
          packageId: artifact.manifest.id,
          version: artifact.manifest.version,
          digest: artifact.digest,
        }),
      );
      return;
    }
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end();
      return;
    }
    const controller = new AbortController();
    response.once("close", () => controller.abort());
    const input = await readBody(request);
    if (request.url === "/subscriptions/next") {
      response.end(JSON.stringify(await streams.next(streamSchema.parse(input).id, controller.signal)));
      return;
    }
    if (request.url === "/subscriptions/cancel") {
      streams.cancel(streamSchema.parse(input).id);
      response.end(JSON.stringify({ done: true }));
      return;
    }
    if (request.url !== "/invoke" && request.url !== "/subscriptions/start") {
      response.statusCode = 404;
      response.end();
      return;
    }
    const invocation = invocationSchema.parse(input);
    const descriptor = artifact.manifest.handlers[invocation.handler];
    if (!descriptor || descriptor.kind === "migration") throw new Error("Unknown remotely callable handler");
    if (request.url === "/invoke") {
      const value = await supervisor.invoke({ ...invocation, artifact, signal: controller.signal });
      response.end(JSON.stringify({ value }));
      return;
    }
    const stream = streams.create();
    try {
      const cancel = await supervisor.subscribe({ ...invocation, artifact, ...stream });
      stream.setCancel(cancel);
      response.end(JSON.stringify({ id: stream.id }));
    } catch (error) {
      streams.cancel(stream.id);
      throw error;
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 8787, options.host ?? "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
  } catch (error) {
    streams.close();
    await supervisor.shutdown();
    throw error;
  }
  return {
    address: server.address(),
    close: async () => {
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      streams.close();
      await supervisor.shutdown();
      await closed;
    },
  };
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const value of request) {
    const chunk = Buffer.from(value);
    length += chunk.byteLength;
    if (length > 1_048_576) throw new Error("Runner request exceeds 1 MiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
