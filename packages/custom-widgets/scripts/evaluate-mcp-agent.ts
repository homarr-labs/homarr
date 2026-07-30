import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createMCPClient } from "@ai-sdk/mcp";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { DEFAULT_GENERATOR_MODEL } from "./ai-evaluation";
import {
  buildCustomWidgetMcpAgentPrompt,
  createCustomWidgetMcpAgent,
  getCustomWidgetMcpToolExecutions,
  getCustomWidgetMcpWorkflowIssues,
} from "./mcp-agent";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const mcpUrl = process.env.HOMARR_MCP_URL;
const mcpApiKey = process.env.HOMARR_MCP_API_KEY;
if (!openRouterApiKey) throw new Error("OPENROUTER_API_KEY is required");
if (!mcpUrl) throw new Error("HOMARR_MCP_URL is required");
if (!mcpApiKey) throw new Error("HOMARR_MCP_API_KEY is required");

const requestedCase = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length) ?? "pokedex";
const definitionId = process.argv.find((value) => value.startsWith("--definition="))?.slice("--definition=".length);
const persist = process.argv.includes("--persist");
const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === requestedCase);
if (!testCase) throw new Error(`Unknown MCP evaluation case '${requestedCase}'`);

const client = await createMCPClient({
  transport: { type: "http", url: mcpUrl, headers: { ApiKey: mcpApiKey } },
});

try {
  const tools = await client.tools();
  const openrouter = createOpenRouter({
    apiKey: openRouterApiKey,
    appName: "Homarr Custom Widget MCP Evaluation",
    appUrl: "https://homarr.dev",
  });
  const agent = createCustomWidgetMcpAgent({
    model: openrouter(process.env.OPENROUTER_GENERATOR_MODEL ?? DEFAULT_GENERATOR_MODEL, {
      structuredOutputs: { strict: true },
      provider: { require_parameters: true, data_collection: "deny" },
    }),
    tools,
  });
  const result = await agent.generate({
    prompt: buildCustomWidgetMcpAgentPrompt({ testCase, persist, definitionId }),
    timeout: 300_000,
  });
  const toolExecutions = getCustomWidgetMcpToolExecutions(result.steps);
  const toolsUsed = toolExecutions.map(({ tool }) => tool);
  const issues = getCustomWidgetMcpWorkflowIssues({
    output: result.output,
    toolExecutions,
    persist,
    definitionId,
    requiredQueryCount: testCase.acceptance.requestRules.filter(({ kind }) => kind !== "action").length,
    requiredActionCount: testCase.acceptance.requestRules.filter(({ kind }) => kind === "action").length,
  });
  const summary = {
    generatedAt: new Date().toISOString(),
    model: process.env.OPENROUTER_GENERATOR_MODEL ?? DEFAULT_GENERATOR_MODEL,
    caseId: testCase.id,
    persist,
    definitionId: definitionId ?? null,
    toolsUsed,
    failedTools: toolExecutions.filter(({ succeeded }) => !succeeded).map(({ tool }) => tool),
    output: result.output,
    workflowIssues: issues,
  };
  const outputDirectory = path.resolve(process.cwd(), ".ai-evaluations", "mcp");
  await mkdir(outputDirectory, { recursive: true });
  const outputFile = path.join(outputDirectory, `${testCase.id}-${Date.now()}.json`);
  await writeFile(outputFile, JSON.stringify(summary, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (result.output.status === "fail" || issues.length > 0) process.exitCode = 1;
} finally {
  await client.close();
}
