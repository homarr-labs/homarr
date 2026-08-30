import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 18091);
const expectedModel = process.env.EXPECTED_MODEL ?? "mock/team-selected-model";
const expectedApiKey = process.env.EXPECTED_API_KEY ?? "workshop-test-openrouter-key";

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, { ok: true });
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/v1/chat/completions") {
    json(response, 404, { error: { message: "Not found" } });
    return;
  }
  if (request.headers.authorization !== `Bearer ${expectedApiKey}`) {
    json(response, 401, { error: { message: "Invalid upstream credentials" } });
    return;
  }
  if (
    request.headers["http-referer"] !== "https://homarr.dev" ||
    request.headers["x-openrouter-title"] !== "Homarr AI Assistant" ||
    request.headers["x-openrouter-metadata"] !== "enabled"
  ) {
    json(response, 400, { error: { message: "Homarr upstream attribution headers are missing or spoofed" } });
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (body.model !== expectedModel) {
    json(response, 400, { error: { message: "Unexpected upstream model" } });
    return;
  }
  if (body.max_completion_tokens !== 32_768 || body.n !== 1 || body.parallel_tool_calls !== false) {
    json(response, 400, { error: { message: "Unsafe generation controls reached the upstream" } });
    return;
  }
  if (
    "max_tokens" in body ||
    "user" in body ||
    "metadata" in body ||
    "extra_body" in body ||
    "extra_headers" in body ||
    "max_tokens" in (body.reasoning ?? {})
  ) {
    json(response, 400, { error: { message: "Private or unbounded request fields reached the upstream" } });
    return;
  }
  const forbiddenCostField = ["audio", "modalities", "logprobs", "top_logprobs", "prediction", "service_tier"].find(
    (field) => field in body,
  );
  if (forbiddenCostField) {
    json(response, 400, { error: { message: `Client cost field was forwarded: ${forbiddenCostField}` } });
    return;
  }
  const forbiddenRoutingField = ["models", "route", "plugins", "transforms"].find((field) => field in body);
  if (forbiddenRoutingField) {
    json(response, 400, { error: { message: `Client routing field was forwarded: ${forbiddenRoutingField}` } });
    return;
  }
  if (body.provider?.zdr !== true || body.provider?.data_collection !== "deny") {
    json(response, 400, { error: { message: "Required upstream privacy controls are missing" } });
    return;
  }
  const webSearchTools = body.tools?.filter((tool) => tool.type === "openrouter:web_search") ?? [];
  if (
    webSearchTools.length > 1 ||
    webSearchTools.some(
      (tool) =>
        tool.parameters?.max_results !== 5 ||
        tool.parameters?.max_uses !== 3 ||
        tool.parameters?.max_total_results !== 10 ||
        tool.parameters?.max_characters !== 2500 ||
        tool.parameters?.search_context_size !== "low",
    )
  ) {
    json(response, 400, { error: { message: "Unbounded web search controls reached the upstream" } });
    return;
  }
  if (body.messages?.some((message) => message.content === "upstream failure")) {
    json(response, 503, { error: { message: "Simulated upstream failure" } });
    return;
  }
  if (body.messages?.some((message) => message.content === "malformed stream")) {
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end('data: {"model":\n\n');
    return;
  }
  if (body.messages?.some((message) => message.content === "in-flight probe")) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const wantsToolCall = body.messages?.some((message) => message.content === "inspect my dashboard");
  if (wantsToolCall && !body.tools?.some((tool) => tool.type === "function" && tool.function?.name === "board_list")) {
    json(response, 400, { error: { message: "The authenticated function tool was not forwarded" } });
    return;
  }

  const completion = {
    id: "gen-workshop-test",
    object: "chat.completion",
    model: body.model,
    choices: [
      wantsToolCall
        ? {
            index: 0,
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call-board-list",
                  type: "function",
                  function: { name: "board_list", arguments: "{}" },
                },
              ],
            },
            finish_reason: "tool_calls",
          }
        : {
            index: 0,
            message: { role: "assistant", content: "Hello from the Homarr provider" },
            finish_reason: "stop",
          },
    ],
    usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19, cost: 0.00041 },
  };
  if (!body.stream) {
    json(response, 200, completion);
    return;
  }

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "x-request-id": "mock-openrouter-request",
  });
  if (wantsToolCall) {
    response.write(
      `data: ${JSON.stringify({
        id: completion.id,
        object: "chat.completion.chunk",
        model: body.model,
        choices: [
          {
            index: 0,
            delta: {
              role: "assistant",
              tool_calls: [
                {
                  index: 0,
                  id: "call-board-list",
                  type: "function",
                  function: { name: "board_list", arguments: "{" },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      })}\n\n`,
    );
    response.write(
      `data: ${JSON.stringify({
        id: completion.id,
        object: "chat.completion.chunk",
        model: body.model,
        choices: [
          {
            index: 0,
            delta: { tool_calls: [{ index: 0, function: { arguments: "}" } }] },
            finish_reason: "tool_calls",
          },
        ],
        usage: completion.usage,
      })}\n\n`,
    );
    response.end("data: [DONE]\n\n");
    return;
  }
  response.write(
    `data: ${JSON.stringify({
      id: completion.id,
      object: "chat.completion.chunk",
      model: body.model,
      choices: [{ index: 0, delta: { role: "assistant", content: "Hello from " }, finish_reason: null }],
    })}\n\n`,
  );
  setTimeout(() => {
    response.write(
      `data: ${JSON.stringify({
        id: completion.id,
        object: "chat.completion.chunk",
        model: body.model,
        choices: [{ index: 0, delta: { content: "the Homarr provider" }, finish_reason: "stop" }],
        usage: completion.usage,
      })}\n\n`,
    );
    response.end("data: [DONE]\n\n");
  }, 150);
});

server.listen(port, "0.0.0.0");
