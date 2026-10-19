import { createMcpHandler, fromJsonSchema, McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { HTTPException } from "hono/http-exception";
import { importWorkerIdentity } from "@homarr/remote-protocol";
import type { RemoteConnection } from "@homarr/remote-protocol";
import type { AuthorizedWorkerConnection } from "../types";
import type { GlobalMcpOptions, McpAccountToken, ServiceApproval, WorkerMcpTool } from "./types";
import { approvedRelay, createMcpRelayConnector } from "./relay";
import { currentWorker } from "./approvals";

const maximumWorkers = 32;
const maximumResultBytes = 4 * 1024 * 1024;
const jsonResult = (value: unknown): CallToolResult => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
function toolError(message: string): CallToolResult {
  return { ...jsonResult({ error: message }), isError: true };
}
interface WorkerTools {
  worker: AuthorizedWorkerConnection;
  approval: ServiceApproval;
  tools: WorkerMcpTool[];
  unavailable?: true;
}

export class GlobalMcpGateway {
  private readonly now: () => number;
  private readonly connect: NonNullable<GlobalMcpOptions["connect"]>;
  private handling = 0;
  private readonly accountRequests = new Map<string, number>();
  private readonly active = new Set<{ approvalId: string; abort: AbortController; revalidate: () => void }>();
  constructor(readonly options: GlobalMcpOptions) {
    this.now = options.now ?? Date.now;
    this.connect = options.connect ?? createMcpRelayConnector(options);
    options.secrets.onRevoke((id) => {
      if (id === "*") this.close();
      else if (id) this.revoke(id);
      else
        for (const active of this.active) {
          try {
            active.revalidate();
          } catch {
            active.abort.abort();
          }
        }
    });
  }
  close() {
    for (const request of this.active) request.abort.abort();
    this.active.clear();
  }
  revoke(approvalId: string) {
    for (const request of this.active) if (request.approvalId === approvalId) request.abort.abort();
  }
  private assertToken(raw: string, expected?: McpAccountToken) {
    const token = this.options.secrets.token(raw, this.now());
    if (
      !token ||
      token.audience !== `${this.options.publicUrl.replace(/\/$/, "")}/mcp` ||
      !this.options.store.user(token.userId) ||
      (expected && token.id !== expected.id) ||
      (token.organizationId && !this.options.store.organizations.get(token.organizationId, token.userId))
    )
      throw new HTTPException(401, { message: "Account authorization expired or was revoked" });
    return token;
  }
  private workers(token: McpAccountToken) {
    return this.options.store
      .workersForPrincipal(token.userId, token.organizationId ?? undefined)
      .slice(0, maximumWorkers);
  }
  private approval(worker: AuthorizedWorkerConnection, token: McpAccountToken): ServiceApproval | null {
    let principalId = `account:${token.userId}`;
    if (worker.organizationId) principalId = `organization:${worker.organizationId}`;
    const approval = this.options.secrets.currentApproval(worker.workerId, principalId, this.now());
    if (approval?.organizationId !== worker.organizationId) return null;
    return approval;
  }
  private assertWorker(
    raw: string,
    token: McpAccountToken,
    worker: AuthorizedWorkerConnection,
    approval: ServiceApproval,
  ) {
    this.assertToken(raw, token);
    const current = currentWorker(this.options, token.userId, worker.workerId, worker.organizationId);
    const live = this.options.secrets.approval(approval.id, this.now());
    if (
      !live?.current ||
      !live.grant ||
      live.workerId !== worker.workerId ||
      live.organizationId !== worker.organizationId ||
      live.principalId !== approval.principalId ||
      live.grant.id !== approval.grant?.id
    )
      throw new HTTPException(403, { message: "Worker MCP approval was revoked" });
    approvedRelay(this.options, current.relayUrl);
    return current;
  }
  private async request<T>(
    raw: string,
    token: McpAccountToken,
    worker: AuthorizedWorkerConnection,
    approval: ServiceApproval,
    path: string,
    init: RequestInit,
    outerSignal: AbortSignal,
  ): Promise<T> {
    const current = this.assertWorker(raw, token, worker, approval);
    const abort = new AbortController();
    const signal = AbortSignal.any([outerSignal, abort.signal, AbortSignal.timeout(20_000)]);
    const active = {
      approvalId: approval.id,
      abort,
      revalidate: () => {
        this.assertWorker(raw, token, worker, approval);
      },
    };
    this.active.add(active);
    const poll = setInterval(() => {
      try {
        this.assertWorker(raw, token, worker, approval);
      } catch {
        abort.abort();
      }
    }, 1000);
    poll.unref();
    let connection: RemoteConnection | undefined;
    try {
      if (signal.aborted) throw new DOMException("MCP request cancelled", "AbortError");
      connection = await this.connect({
        worker: current,
        approval,
        identity: await importWorkerIdentity(approval.privateJwk),
        signal,
      });
      this.assertWorker(raw, token, current, approval);
      const response = await connection.fetch(path, { ...init, signal });
      if (!response.ok) throw new Error("The worker rejected this MCP request");
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader)
        try {
          while (true) {
            this.assertWorker(raw, token, current, approval);
            const item = await reader.read();
            this.assertWorker(raw, token, current, approval);
            if (item.done) break;
            length += item.value.length;
            if (length > maximumResultBytes) throw new Error("Worker result exceeds the hosted MCP limit");
            chunks.push(item.value);
          }
        } finally {
          await reader.cancel().catch(() => undefined);
        }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      this.assertWorker(raw, token, current, approval);
      return JSON.parse(new TextDecoder().decode(bytes)) as T;
    } finally {
      clearInterval(poll);
      this.active.delete(active);
      connection?.close();
    }
  }
  async handle(incoming: Request, raw: string): Promise<Response> {
    const token = this.assertToken(raw);
    const count = this.accountRequests.get(token.userId) ?? 0;
    if (this.handling >= 32 || count >= 8)
      throw new HTTPException(429, { message: "Too many concurrent MCP requests" });
    this.handling++;
    this.accountRequests.set(token.userId, count + 1);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 30_000);
    timeout.unref();
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(timeout);
      this.handling--;
      const remaining = (this.accountRequests.get(token.userId) ?? 1) - 1;
      if (remaining > 0) this.accountRequests.set(token.userId, remaining);
      else this.accountRequests.delete(token.userId);
    };
    const request = new Request(incoming, { signal: AbortSignal.any([incoming.signal, abort.signal]) });
    request.signal.addEventListener("abort", release, { once: true });
    try {
      const response = await this.execute(request, raw);
      if (!response.body) {
        release();
        return response;
      }
      const reader = response.body.getReader();
      return new Response(
        new ReadableStream<Uint8Array>({
          pull: async (controller) => {
            try {
              const item = await reader.read();
              if (item.done) {
                release();
                controller.close();
              } else controller.enqueue(item.value);
            } catch (error) {
              release();
              controller.error(error);
            }
          },
          cancel: async (reason) => {
            abort.abort();
            release();
            await reader.cancel(reason);
          },
        }),
        { status: response.status, statusText: response.statusText, headers: response.headers },
      );
    } catch (error) {
      release();
      throw error;
    }
  }
  private async execute(request: Request, raw: string): Promise<Response> {
    const token = this.assertToken(raw);
    const workers = this.workers(token);
    const catalogs: WorkerTools[] = [];
    // Bound fan-out and retain partial availability when one worker is offline.
    for (let offset = 0; offset < workers.length; offset += 4)
      await Promise.all(
        workers.slice(offset, offset + 4).map(async (worker) => {
          const approval = this.approval(worker, token);
          if (!approval) return;
          try {
            const catalog = await this.request<{ tools: WorkerMcpTool[] }>(
              raw,
              token,
              worker,
              approval,
              "/remote/mcp/catalog",
              {},
              request.signal,
            );
            if (!Array.isArray(catalog.tools) || catalog.tools.length > 256) throw new Error("Invalid worker catalog");
            const tools = catalog.tools.filter(
              (tool) =>
                /^[a-zA-Z0-9_.-]{1,128}$/.test(tool.name) &&
                typeof tool.description === "string" &&
                Array.isArray(tool.pathInRouter) &&
                tool.inputSchema?.type === "object",
            );
            catalogs.push({ worker, approval, tools });
          } catch {
            this.assertToken(raw, token);
            catalogs.push({ worker, approval, tools: [], unavailable: true });
          }
        }),
      );
    this.assertToken(raw, token);
    const tools = new Map<string, { tool: WorkerMcpTool; workers: Set<string> }>();
    for (const catalog of catalogs)
      for (const tool of catalog.tools) {
        if (tool.name.startsWith("homarr_")) continue;
        const existing = tools.get(tool.name);
        if (existing) {
          if (JSON.stringify(existing.tool.inputSchema) === JSON.stringify(tool.inputSchema))
            existing.workers.add(catalog.worker.workerId);
          continue;
        }
        tools.set(tool.name, { tool, workers: new Set([catalog.worker.workerId]) });
      }
    const handler = createMcpHandler(
      () => {
        const server = new McpServer(
          { name: "homarr-workers", version: "1.0.0" },
          {
            capabilities: { tools: {} },
            instructions:
              "Discover workers and integrations first. Every native tool requires an explicit workerId; integration IDs are local to that worker. Never silently reroute failed calls or retry mutations. Account and organization membership and worker-issued service permissions remain authoritative.",
          },
        );
        server.registerTool(
          "homarr_workers",
          {
            description:
              "List current account and organization workers, their roles/purpose and hosted MCP approval/availability. Browser connection settings do not change this service: hosted MCP always uses the encrypted relay.",
            inputSchema: fromJsonSchema({ type: "object", properties: {}, additionalProperties: false }),
          },
          async () => {
            this.assertToken(raw, token);
            return jsonResult({
              workers: this.workers(token).map((worker) => {
                const approval = this.approval(worker, token);
                const catalog = catalogs.find(
                  (entry) =>
                    entry.worker.workerId === worker.workerId && entry.worker.organizationId === worker.organizationId,
                );
                return {
                  workerId: worker.workerId,
                  organizationId: worker.organizationId,
                  purpose: worker.purpose,
                  name: worker.name,
                  role: worker.role,
                  transport: "encrypted-relay",
                  mcpApproved: Boolean(approval),
                  available: Boolean(catalog && !catalog.unavailable),
                  expiresAt: approval?.expiresAt ?? null,
                };
              }),
              limit: maximumWorkers,
            });
          },
        );
        server.registerTool(
          "homarr_integrations",
          {
            description:
              "List integrations explicitly approved for hosted MCP across current workers. Returns workerId, organizationId and integrationId provenance. Optionally select one workerId. Private integration credentials and network routes are never returned.",
            inputSchema: fromJsonSchema({
              type: "object",
              properties: { workerId: { type: "string", minLength: 1, maxLength: 128 } },
              additionalProperties: false,
            }),
          },
          async (args, context) => {
            const input = args as { workerId?: string };
            const result: unknown[] = [];
            const unavailable: string[] = [];
            for (const catalog of catalogs) {
              if (input.workerId && catalog.worker.workerId !== input.workerId) continue;
              try {
                const response = await this.request<{ integrations: Record<string, unknown>[] }>(
                  raw,
                  token,
                  catalog.worker,
                  catalog.approval,
                  "/remote/mcp/integrations",
                  {},
                  AbortSignal.any([request.signal, context.mcpReq.signal]),
                );
                if (!Array.isArray(response.integrations) || response.integrations.length > 1000)
                  throw new Error("Invalid integration discovery");
                const service = catalog.approval.grant?.service;
                if (!service) throw new Error("MCP approval is unavailable");
                for (const integration of response.integrations) {
                  const id = integration.id;
                  if (typeof id !== "string" || !service.integrationIds.includes(id)) continue;
                  const permissions = integration.permissions as Record<string, unknown> | undefined;
                  result.push({
                    integrationId: id,
                    name: typeof integration.name === "string" ? integration.name.slice(0, 100) : id,
                    kind: typeof integration.kind === "string" ? integration.kind.slice(0, 100) : "unknown",
                    permissions: {
                      hasUseAccess: permissions?.hasUseAccess === true,
                      hasInteractAccess: permissions?.hasInteractAccess === true && service.access !== "query",
                      hasFullAccess: permissions?.hasFullAccess === true && service.access === "full",
                    },
                    workerId: catalog.worker.workerId,
                    organizationId: catalog.worker.organizationId,
                  });
                }
              } catch {
                this.assertToken(raw, token);
                unavailable.push(catalog.worker.workerId);
              }
            }
            this.assertToken(raw, token);
            return jsonResult({ integrations: result, unavailableWorkers: unavailable });
          },
        );
        for (const [name, entry] of tools) {
          const schema = {
            type: "object",
            properties: {
              workerId: {
                type: "string",
                enum: [...entry.workers],
                description: "Worker ID from homarr_workers or homarr_integrations.",
              },
              arguments: entry.tool.inputSchema,
            },
            required: ["workerId"],
            additionalProperties: false,
          };
          server.registerTool(
            name,
            {
              description: `${entry.tool.description} Select workerId explicitly; pass the native tool input in arguments.`,
              inputSchema: fromJsonSchema(schema),
              annotations: entry.tool.annotations,
            },
            async (args, context) => {
              const input = args as { workerId: string; arguments?: unknown };
              const catalog = catalogs.find(
                (item) => item.worker.workerId === input.workerId && entry.workers.has(item.worker.workerId),
              );
              if (!catalog) return toolError("This tool is unavailable on the selected worker");
              try {
                const result = await this.request<CallToolResult>(
                  raw,
                  token,
                  catalog.worker,
                  catalog.approval,
                  "/remote/mcp/call",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, input: input.arguments ?? {} }),
                  },
                  AbortSignal.any([request.signal, context.mcpReq.signal]),
                );
                if (!Array.isArray(result.content)) return toolError("The worker returned an invalid MCP result");
                this.assertWorker(raw, token, catalog.worker, catalog.approval);
                return {
                  ...result,
                  content: [
                    {
                      type: "text" as const,
                      text: JSON.stringify({
                        workerId: catalog.worker.workerId,
                        organizationId: catalog.worker.organizationId,
                      }),
                    },
                    ...result.content,
                  ],
                };
              } catch {
                return toolError(
                  "The selected worker rejected the request or is unavailable. Check current membership and the worker's MCP approval.",
                );
              }
            },
          );
        }
        return server;
      },
      { legacy: "stateless" },
    );
    const response = await handler.fetch(request);
    if (!response.body) return response;
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          this.assertToken(raw, token);
          const chunk = await reader.read();
          this.assertToken(raw, token);
          if (chunk.done) controller.close();
          else controller.enqueue(chunk.value);
        } catch (error) {
          await reader.cancel().catch(() => undefined);
          controller.error(error);
        }
      },
      cancel: (reason) => reader.cancel(reason),
    });
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
