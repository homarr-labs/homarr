import { createRouterClient, walkProcedureContractsAsync } from "@orpc/server";

import { appRouter } from "@homarr/api";
import { callMcpTool, mcpRouter } from "@homarr/api/mcp";
import type { McpTool } from "@homarr/api/mcp";
import { toAssistantToolOutput } from "@homarr/api/http/assistant/assistant-tool-output";
import { getSafeAssistantToolError } from "@homarr/api/http/assistant/assistant-tool-error";
import { extractMcpTools } from "@homarr/api/http/mcp/_extract-tools";
import { db } from "@homarr/db";
import { WorkerAccessError } from "@homarr/worker-access";
import type { AccessGrant, AccessPrincipal, ServiceScope } from "@homarr/worker-access";

import { createWorkerApiContext, getReadSession } from "./api";
import type { WorkerState } from "./state";

const discovery = new Set([
  "integration.all",
  "integration.getKinds",
  "integration.search",
  "integration.allThatSupportSearch",
  "integration.allOfGivenCategory",
  "integration.byIds",
]);
const fullAccess = new Set(["integration.request", "integration.byId", "federation.executeSource"]);
const selectedQueries = new Set(["integration.searchMediaRequests"]);
let eligible: Promise<Map<string, "query" | "interact" | "full">> | undefined;

/** Derive the delegation surface from reviewed native integration middleware metadata. */
async function serviceProcedures() {
  eligible ??= (async () => {
    const result = new Map<string, "query" | "interact" | "full">();
    const collect = (procedure: Parameters<Parameters<typeof walkProcedureContractsAsync>[1]>[0], path: string[]) => {
      const name = path.join(".");
      const meta = procedure["~orpc"].meta;
      const integration = meta.integration as { action?: string } | undefined;
      if (integration && ["query", "interact", "full"].includes(integration.action ?? "")) {
        result.set(name, integration.action as "query" | "interact" | "full");
      } else if (discovery.has(name)) result.set(name, "query");
      else if (selectedQueries.has(name)) result.set(name, "query");
      else if (fullAccess.has(name)) result.set(name, "full");
    };
    await walkProcedureContractsAsync(appRouter, collect);
    await walkProcedureContractsAsync(mcpRouter, collect);
    return result;
  })();
  return eligible;
}

export async function validateServiceApproval(scope: ServiceScope) {
  const procedures = await serviceProcedures();
  if (!scope || !Array.isArray(scope.procedurePaths))
    throw new WorkerAccessError("INVALID_INPUT", "Explicit service procedures required");
  if (!Array.isArray(scope.integrationIds) || !scope.integrationIds.length || scope.integrationIds.length > 1000)
    throw new WorkerAccessError("INVALID_INPUT", "Explicit service integrations required");
  const selected = [...new Set(scope.integrationIds)];
  const records = await db.query.integrations.findMany({
    columns: { id: true },
    where: (table, { inArray }) => inArray(table.id, selected),
  });
  if (records.length !== selected.length)
    throw new WorkerAccessError("INVALID_INPUT", "Select existing integrations on this worker");
  if (scope.purpose !== "mcp") {
    const origins = await db.query.integrationOrigins.findMany({
      where: (table, { inArray }) => inArray(table.integrationId, selected),
      columns: { integrationId: true },
    });
    if (origins.length)
      throw new WorkerAccessError("INVALID_INPUT", "Federation grants require integrations hosted by this worker");
  }
  for (const path of scope.procedurePaths) {
    const required = procedures.get(path);
    if (
      !required ||
      (required === "full" && scope.access !== "full") ||
      (required === "interact" && scope.access === "query")
    ) {
      throw new WorkerAccessError("INVALID_INPUT", "Service approval contains an unsupported operation or permission");
    }
  }
}

function permittedTool(grant: AccessGrant, tool: McpTool) {
  if (grant.role === "owner") return true;
  const scope = grant.service;
  if (grant.role !== "service" || !scope || !scope.procedurePaths.includes(tool.pathInRouter.join("."))) return false;
  return tool.type === "query" || scope.access !== "query";
}

export async function getServiceCatalog(state: WorkerState, principal: AccessPrincipal) {
  const grant = state.access.assertActive(principal);
  if (grant.role !== "owner" && grant.role !== "service")
    throw new WorkerAccessError("FORBIDDEN", "Service or owner grant required");
  const paths = await serviceProcedures();
  state.access.assertActive(principal);
  return {
    tools: extractMcpTools().filter((tool) => permittedTool(grant, tool)),
    serviceProcedurePaths: [...paths.keys()],
    serviceAccessByPath: Object.fromEntries(paths),
  };
}

export async function getServiceIntegrations(state: WorkerState, principal: AccessPrincipal) {
  const grant = state.access.assertActive(principal);
  if (grant.role !== "owner" && (grant.role !== "service" || !grant.service))
    throw new WorkerAccessError("FORBIDDEN", "Service or owner grant required");
  const records = await db.query.integrations.findMany({
    columns: { id: true, name: true, kind: true },
    where: (table, { inArray }) => {
      if (grant.role === "owner") return undefined;
      return inArray(table.id, grant.service?.integrationIds ?? []);
    },
  });
  let integrations = records;
  if (grant.role === "service" && grant.service?.purpose !== "mcp") {
    const origins = await db.query.integrationOrigins.findMany({ columns: { integrationId: true } });
    const aliases = new Set(origins.map(({ integrationId }) => integrationId));
    integrations = records.filter(({ id }) => !aliases.has(id));
  }
  state.access.assertActive(principal);
  return {
    integrations: integrations.map((record) => ({
      ...record,
      permissions: {
        hasUseAccess: true,
        hasInteractAccess: grant.role === "owner" || grant.service?.access !== "query",
        hasFullAccess: grant.role === "owner" || grant.service?.access === "full",
      },
    })),
  };
}

/** Execute with the service's own native identity; native validation and ACL remain authoritative. */
export async function callServiceTool(
  state: WorkerState,
  principal: AccessPrincipal,
  input: { name: unknown; input?: unknown },
  request: Request,
) {
  if (typeof input.name !== "string") throw new WorkerAccessError("INVALID_INPUT", "Tool name required");
  const catalog = await getServiceCatalog(state, principal);
  const tool = catalog.tools.find((candidate) => candidate.name === input.name);
  if (!tool) throw new WorkerAccessError("FORBIDDEN", "Tool is outside the approved service capability");
  const session = await getReadSession(state, principal);
  const caller = createRouterClient(mcpRouter, {
    context: createWorkerApiContext(state, principal, session, request.headers),
  });
  request.signal.throwIfAborted();
  try {
    const result = await callMcpTool(caller, tool, input.input, { signal: request.signal });
    state.access.assertActive(principal);
    request.signal.throwIfAborted();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(toAssistantToolOutput(result)) ?? "null" }],
    };
  } catch (error) {
    state.access.assertActive(principal);
    request.signal.throwIfAborted();
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: getSafeAssistantToolError(error, { toolName: tool.name }) }),
        },
      ],
    };
  }
}
