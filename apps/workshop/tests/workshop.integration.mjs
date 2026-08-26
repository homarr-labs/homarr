const baseUrl = process.env.WORKSHOP_TEST_URL ?? "http://127.0.0.1:18090";

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const expectStatus = async (path, init, expected) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`Expected ${expected} for ${path}, received ${response.status}: ${body}`);
  }
};

const root = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: "workshop-test@example.invalid", password: "WorkshopLocalTest123!" }),
});
const rootHeaders = { authorization: `Bearer ${root.token}` };
const collections = await request("/api/collections?perPage=200", { headers: rootHeaders });
const collectionNames = new Set(collections.items.map((collection) => collection.name));
for (const required of [
  "submissions",
  "votes",
  "comments",
  "reports",
  "workshop_listings",
  "workshop_report_summaries",
  "assistant_quotas",
  "assistant_global_quota",
]) {
  if (!collectionNames.has(required)) throw new Error(`Missing Workshop collection: ${required}`);
}
for (const removed of ["workshop_admin_actions", "workshop_admins", "assistant_requests", "assistant_activity"]) {
  if (collectionNames.has(removed)) throw new Error(`Removed Workshop collection still exists: ${removed}`);
}

// Production uses GitHub OAuth. Password auth is enabled only in this disposable database.
const usersCollection = await request("/api/collections/users", { headers: rootHeaders });
if (usersCollection.createRule !== '@request.context = "oauth2" && @request.body.isAdmin:isset = false') {
  throw new Error("User creation must be limited to OAuth without administrator fields");
}
await request("/api/collections/users", {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ ...usersCollection, passwordAuth: { enabled: true, identityFields: ["email"] } }),
});

const createUser = async (email, name, password, extra = {}) =>
  request("/api/collections/users/records", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({
      email,
      emailVisibility: false,
      verified: true,
      password,
      passwordConfirm: password,
      name,
      ...extra,
    }),
  });

const signIn = async (email, password) => {
  const auth = await request("/api/collections/users/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: email, password }),
  });
  return { auth, headers: { authorization: `Bearer ${auth.token}` } };
};

const authorPassword = "WorkshopAuthor123!";
const author = await createUser("widget-author@example.invalid", "widget-author", authorPassword);
const authorSession = await signIn(author.email, authorPassword);
await expectStatus(
  `/api/collections/users/records/${author.id}`,
  { method: "PATCH", headers: authorSession.headers, body: JSON.stringify({ isAdmin: true }) },
  404,
);
await expectStatus(
  `/api/collections/users/records/${author.id}`,
  { method: "PATCH", headers: authorSession.headers, body: JSON.stringify({ name: "homarr-labs" }) },
  404,
);
const unchangedAuthor = await request(`/api/collections/users/records/${author.id}`, {
  headers: authorSession.headers,
});
if (unchangedAuthor.name !== "widget-author") {
  throw new Error("Workshop users can forge OAuth provider identity fields");
}

const visitorPassword = "WorkshopVisitor123!";
const visitor = await createUser("widget-visitor@example.invalid", "widget-visitor", visitorPassword);
const visitorSession = await signIn(visitor.email, visitorPassword);
const concurrencyPassword = "WorkshopConcurrency123!";
const concurrencyUser = await createUser(
  "provider-concurrency@example.invalid",
  "provider-concurrency",
  concurrencyPassword,
);
const concurrencySession = await signIn(concurrencyUser.email, concurrencyPassword);

const modelList = await request("/api/ai/v1/models");
if (
  modelList.object !== "list" ||
  modelList.data.length !== 1 ||
  modelList.data[0].id !== "homarr/model" ||
  modelList.data[0].context_length !== 256 * 1024
) {
  throw new Error("The Homarr provider must advertise exactly one model");
}
await expectStatus("/api/ai/usage", {}, 401);
await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    body: JSON.stringify({
      model: "homarr/model",
      messages: [{ role: "user", content: "unauthenticated" }],
    }),
  },
  401,
);
await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: { authorization: "Bearer forged-workshop-user-token" },
    body: JSON.stringify({
      model: "homarr/model",
      messages: [{ role: "user", content: "forged identity" }],
    }),
  },
  401,
);

const inFlightProbe = () =>
  fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...concurrencySession.headers },
    body: JSON.stringify({
      model: "homarr/model",
      messages: [{ role: "user", content: "in-flight probe" }],
      stream: false,
    }),
  });
const inFlightResponses = await Promise.all([inFlightProbe(), inFlightProbe(), inFlightProbe()]);
if (
  inFlightResponses
    .map((response) => response.status)
    .toSorted()
    .join(",") !== "200,200,429"
) {
  throw new Error("The per-user in-flight request limit was not enforced");
}
const concurrencyUsage = await request("/api/ai/usage", { headers: concurrencySession.headers });
if (concurrencyUsage.used !== 2) {
  throw new Error(`Rejected in-flight requests must not consume allowance: ${JSON.stringify(concurrencyUsage)}`);
}

const initialUsage = await request("/api/ai/usage", { headers: authorSession.headers });
const initialReset = new Date(initialUsage.resetsAt);
if (
  initialUsage.limit !== 50 ||
  initialUsage.used !== 0 ||
  initialUsage.remaining !== 50 ||
  initialReset.getUTCHours() !== 0 ||
  initialReset <= new Date()
) {
  throw new Error(`Unexpected initial Homarr provider allowance: ${JSON.stringify(initialUsage)}`);
}
const forgedDateUsage = await request("/api/ai/usage", {
  headers: { ...authorSession.headers, date: "Thu, 01 Jan 2099 00:00:00 GMT" },
});
if (forgedDateUsage.resetsAt !== initialUsage.resetsAt || forgedDateUsage.remaining !== initialUsage.remaining) {
  throw new Error(`A client-controlled date changed the server allowance: ${JSON.stringify(forgedDateUsage)}`);
}

await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: authorSession.headers,
    body: JSON.stringify({
      model: "homarr/model",
      messages: [
        { role: "user", content: "too many tools" },
        ...Array.from({ length: 1000 }, (_, index) => ({
          role: "tool",
          tool_call_id: `tool-${index}`,
          content: "{}",
        })),
      ],
    }),
  },
  400,
);

await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: authorSession.headers,
    body: JSON.stringify({
      model: "homarr/model",
      messages: [{ role: "user", content: "x".repeat(256 * 1024 + 1) }],
    }),
  },
  413,
);
await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: authorSession.headers,
    body: JSON.stringify({
      model: "homarr/model",
      messages: [
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "https://attacker.example/tracker.png" } }],
        },
      ],
    }),
  },
  413,
);
const usageAfterRejectedRequest = await request("/api/ai/usage", { headers: authorSession.headers });
if (usageAfterRejectedRequest.used !== 0) {
  throw new Error("A rejected oversized request-unit batch consumed allowance");
}

await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: authorSession.headers,
    body: JSON.stringify({ model: "another-model", messages: [{ role: "user", content: "hello" }] }),
  },
  400,
);

const streamStartedAt = performance.now();
const streamResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...authorSession.headers },
  body: JSON.stringify({
    model: "homarr/model",
    messages: [{ role: "user", content: "hello" }],
    stream: true,
  }),
});
if (!streamResponse.ok || streamResponse.headers.get("x-homarr-quota-remaining") !== "49") {
  throw new Error(`Streaming provider request failed: ${streamResponse.status}`);
}
const streamReader = streamResponse.body.getReader();
const firstChunk = await streamReader.read();
const firstChunkAt = performance.now();
let streamText = new TextDecoder().decode(firstChunk.value ?? new Uint8Array());
while (true) {
  const chunk = await streamReader.read();
  if (chunk.done) break;
  streamText += new TextDecoder().decode(chunk.value);
}
const dataFrames = streamText.split(/\r?\n/u).filter((line) => line.startsWith("data:"));
if (
  firstChunk.done ||
  !streamText.includes("Hello from ") ||
  !streamText.includes("the Homarr provider") ||
  streamText.includes("mock/team-selected-model") ||
  !streamText.includes('"model":"homarr/model"') ||
  dataFrames.length < 3 ||
  dataFrames.at(-1)?.trim() !== "data: [DONE]" ||
  firstChunkAt - streamStartedAt > 5_000
) {
  throw new Error("The Homarr provider did not preserve the upstream SSE stream");
}
const malformedStreamResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...concurrencySession.headers },
  body: JSON.stringify({
    model: "homarr/model",
    messages: [{ role: "user", content: "malformed stream" }],
    stream: true,
  }),
});
const malformedStreamText = await malformedStreamResponse.text();
if (
  !malformedStreamResponse.ok ||
  !malformedStreamText.includes('"type":"homarr_provider_error"') ||
  malformedStreamText.includes('data: {"model":') ||
  !malformedStreamText.endsWith("data: [DONE]\n\n")
) {
  throw new Error(`Malformed upstream streams did not terminate safely: ${malformedStreamText}`);
}
const toolResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...authorSession.headers,
    "http-referer": "https://attacker.example",
    "x-openrouter-title": "Attacker",
    "x-openrouter-metadata": "attacker",
  },
  body: JSON.stringify({
    model: "homarr/model",
    messages: [
      { role: "user", content: "inspect my dashboard" },
      { role: "assistant", content: null, tool_calls: [{ id: "one" }, { id: "two" }] },
      { role: "tool", tool_call_id: "one", content: "{}" },
      { role: "tool", tool_call_id: "two", content: "{}" },
    ],
    stream: false,
    models: ["attacker/model"],
    provider: { order: ["attacker"] },
    route: "fallback",
    plugins: ["web"],
    transforms: ["middle-out"],
    max_tokens: 1_000_000,
    max_completion_tokens: 1_000_000,
    n: 100,
    parallel_tool_calls: true,
    extra_body: { provider: { order: ["attacker"] } },
    extra_headers: { Authorization: "Bearer attacker" },
    metadata: { user: "must-not-reach-openrouter" },
    audio: { format: "wav", voice: "alloy" },
    modalities: ["text", "audio"],
    logprobs: true,
    top_logprobs: 20,
    prediction: { content: "attacker-controlled prediction" },
    service_tier: "priority",
    reasoning: { effort: "high", max_tokens: 1_000_000 },
    user: "must-not-reach-openrouter",
    tools: [
      { type: "function", function: { name: "board_list" } },
      { type: "openrouter:web_search", parameters: { max_results: 1000, max_uses: 1000 } },
      { type: "openrouter:web_search" },
    ],
  }),
});
if (!toolResponse.ok || toolResponse.headers.get("x-homarr-quota-remaining") !== "48") {
  throw new Error("Every upstream inference must consume one Homarr provider request unit");
}
const toolCompletion = await toolResponse.json();
if (
  toolCompletion.model !== "homarr/model" ||
  toolCompletion.choices?.[0]?.finish_reason !== "tool_calls" ||
  toolCompletion.choices?.[0]?.message?.tool_calls?.[0]?.function?.name !== "board_list"
) {
  throw new Error(
    `The public model alias or function tool response was not forwarded: ${JSON.stringify(toolCompletion)}`,
  );
}

const streamedToolResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...concurrencySession.headers },
  body: JSON.stringify({
    model: "homarr/model",
    messages: [{ role: "user", content: "inspect my dashboard" }],
    tools: [{ type: "function", function: { name: "board_list", parameters: { type: "object" } } }],
    stream: true,
  }),
});
const streamedToolText = await streamedToolResponse.text();
if (
  !streamedToolResponse.ok ||
  streamedToolText.includes("mock/team-selected-model") ||
  !streamedToolText.includes('"model":"homarr/model"') ||
  !streamedToolText.includes('"name":"board_list"') ||
  !streamedToolText.includes('"arguments":"{"') ||
  !streamedToolText.includes('"arguments":"}"') ||
  !streamedToolText.includes('"finish_reason":"tool_calls"') ||
  !streamedToolText.endsWith("data: [DONE]\n\n")
) {
  throw new Error(`Streamed function tool calls were not preserved safely: ${streamedToolText}`);
}

const afterToolsUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (afterToolsUsage.used !== 2 || afterToolsUsage.remaining !== 48) {
  throw new Error(`Tool request accounting is incorrect: ${JSON.stringify(afterToolsUsage)}`);
}

const upstreamFailure = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...authorSession.headers },
  body: JSON.stringify({
    model: "homarr/model",
    messages: [{ role: "user", content: "upstream failure" }],
    stream: false,
  }),
});
if (upstreamFailure.status !== 503 || upstreamFailure.headers.get("x-homarr-quota-remaining") !== "47") {
  throw new Error("Every request forwarded upstream must consume Homarr provider allowance");
}
const upstreamFailureBody = await upstreamFailure.text();
if (upstreamFailureBody.includes("Simulated upstream failure")) {
  throw new Error("Upstream error details must not be exposed to clients");
}
const afterFailureUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (afterFailureUsage.used !== 3 || afterFailureUsage.remaining !== 47) {
  throw new Error(`Forwarded upstream failure escaped quota accounting: ${JSON.stringify(afterFailureUsage)}`);
}
const visitorUsage = await request("/api/ai/usage", { headers: visitorSession.headers });
if (visitorUsage.used !== 0 || visitorUsage.remaining !== 50) {
  throw new Error(`Provider allowance leaked across users: ${JSON.stringify(visitorUsage)}`);
}

await expectStatus("/api/collections/assistant_quotas/records", { headers: authorSession.headers }, 403);
await expectStatus("/api/collections/assistant_global_quota/records", { headers: authorSession.headers }, 403);
const quotas = await request("/api/collections/assistant_quotas/records?perPage=20", { headers: rootHeaders });
const authorQuota = quotas.items.find((item) => item.user === author.id);
if (
  !authorQuota ||
  authorQuota.used !== 3 ||
  ["dailyLimit", "inputTokens", "outputTokens", "totalTokens", "model", "cost"].some((field) => field in authorQuota)
) {
  throw new Error(`Private provider quota is incorrect: ${JSON.stringify(authorQuota)}`);
}

await request(`/api/collections/assistant_quotas/records/${authorQuota.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ day: "2000-01-01", used: 49 }),
});
const resetUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (resetUsage.limit !== 50 || resetUsage.used !== 0 || resetUsage.remaining !== 50) {
  throw new Error(`Quota did not reset at the UTC day boundary: ${JSON.stringify(resetUsage)}`);
}
const today = new Date().toISOString().slice(0, 10);
const resetQuotas = (
  await request("/api/collections/assistant_quotas/records?perPage=20", { headers: rootHeaders })
).items.filter((item) => item.user === author.id);
const historicalQuota = resetQuotas.find((item) => item.id === authorQuota.id);
const resetQuota = resetQuotas.find((item) => item.day === today);
if (
  resetQuotas.length !== 2 ||
  historicalQuota?.day !== "2000-01-01" ||
  historicalQuota.used !== 49 ||
  !resetQuota ||
  resetQuota.used !== 0
) {
  throw new Error(`Daily quota history was not preserved: ${JSON.stringify(resetQuotas)}`);
}
await request(`/api/collections/assistant_quotas/records/${resetQuota.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ used: 49 }),
});

const allowanceProbe = () =>
  fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authorSession.headers },
    body: JSON.stringify({
      model: "homarr/model",
      messages: [{ role: "user", content: "allowance probe" }],
      stream: false,
    }),
  });
const concurrentAllowanceResponses = await Promise.all([allowanceProbe(), allowanceProbe()]);
const concurrentStatuses = concurrentAllowanceResponses.map((response) => response.status).toSorted();
const exhaustedResponse = concurrentAllowanceResponses.find((response) => response.status === 429);
if (
  concurrentStatuses.join(",") !== "200,429" ||
  exhaustedResponse?.headers.get("x-homarr-quota-remaining") !== "0" ||
  !exhaustedResponse.headers.get("x-homarr-quota-reset")
) {
  throw new Error("The per-user allowance was not enforced atomically");
}

const globalQuota = (await request("/api/collections/assistant_global_quota/records", { headers: rootHeaders }))
  .items[0];
await request(`/api/collections/assistant_global_quota/records/${globalQuota.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ day: new Date().toISOString().slice(0, 10), used: 9_999 }),
});
await request(`/api/collections/assistant_quotas/records/${resetQuota.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ used: 0 }),
});
const globalResponses = await Promise.all([
  allowanceProbe(),
  fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...visitorSession.headers },
    body: JSON.stringify({ model: "homarr/model", messages: [{ role: "user", content: "global allowance probe" }] }),
  }),
]);
if (
  globalResponses
    .map((response) => response.status)
    .toSorted()
    .join(",") !== "200,429"
) {
  throw new Error("The shared upstream allowance was not enforced atomically across users");
}

const widget = {
  $schema: "homarr-custom-widget-v2",
  name: "Workshop runtime probe",
  sources: {
    default: {
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: "none",
    },
  },
  requests: {},
  options: {},
  template: "<Text>Runtime probe</Text>",
};

const submission = await request("/api/collections/submissions/records", {
  method: "POST",
  headers: authorSession.headers,
  body: JSON.stringify({
    type: "customWidget",
    title: "Workshop runtime probe",
    description: "PocketBase integration test",
    widgetSchema: widget.$schema,
    content: JSON.stringify(widget),
    author: author.id,
    revision: 999,
    changelog: "Forged publication metadata",
    outdated: true,
  }),
});
if (
  submission.author !== author.id ||
  submission.title !== "Workshop runtime probe" ||
  submission.widgetSchema !== widget.$schema ||
  submission.revision !== 1 ||
  submission.changelog !== "" ||
  submission.outdated !== false
) {
  throw new Error("Submission publication metadata was not initialized server-side");
}
const ownerVotes = await request("/api/collections/votes/records", { headers: authorSession.headers });
if (
  ownerVotes.items.length !== 1 ||
  ownerVotes.items[0].submission !== submission.id ||
  ownerVotes.items[0].value !== 1
) {
  throw new Error("New submissions must receive one real author-owned upvote");
}

const updatedSubmission = await request(`/api/collections/submissions/records/${submission.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ title: "Updated runtime probe", expectedRevision: 1, revision: 500 }),
});
if (updatedSubmission.title !== "Updated runtime probe" || updatedSubmission.revision !== 2)
  throw new Error("Authors must be able to edit their submission");
const outdatedSubmission = await request(`/api/collections/submissions/records/${submission.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ outdated: true, expectedRevision: 2, revision: 900, changelog: "Needs a newer API" }),
});
if (!outdatedSubmission.outdated || outdatedSubmission.revision !== 3) {
  throw new Error("PocketBase must own submission revision increments");
}

for (let attempt = 0; attempt < 5; attempt += 1) {
  const expectedRevision = 3 + attempt;
  const concurrentUpdates = await Promise.all(
    ["Concurrent first", "Concurrent second"].map((title) =>
      fetch(`${baseUrl}/api/collections/submissions/records/${submission.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...authorSession.headers },
        body: JSON.stringify({ title: `${title} ${attempt}`, expectedRevision }),
      }),
    ),
  );
  if (concurrentUpdates.filter((response) => response.ok).length !== 1) {
    throw new Error("Exactly one update may consume an expected submission revision");
  }
}

await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "PATCH", headers: authorSession.headers, body: JSON.stringify({ author: visitor.id }) },
  404,
);
await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "PATCH", headers: visitorSession.headers, body: JSON.stringify({ title: "Not mine" }) },
  404,
);
await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "DELETE", headers: visitorSession.headers },
  404,
);

const vote = await request("/api/collections/votes/records", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({ submission: submission.id, user: visitor.id, value: 1 }),
});
await expectStatus(
  "/api/collections/votes/records",
  {
    method: "POST",
    headers: visitorSession.headers,
    body: JSON.stringify({ submission: submission.id, user: visitor.id, value: 1 }),
  },
  400,
);
await expectStatus(
  `/api/collections/votes/records/${vote.id}`,
  { method: "PATCH", headers: visitorSession.headers, body: JSON.stringify({ user: author.id }) },
  404,
);
await expectStatus(
  `/api/collections/votes/records/${vote.id}`,
  { method: "PATCH", headers: visitorSession.headers, body: JSON.stringify({ value: 0 }) },
  404,
);

const listing = await request(`/api/collections/workshop_listings/records/${submission.id}`);
if (
  listing.score !== 2 ||
  listing.upvotes !== 2 ||
  listing.downvotes !== 0 ||
  listing.authorName !== "widget-author" ||
  listing.widgetSchema !== widget.$schema
) {
  throw new Error("Workshop listing data is incorrect");
}

const comment = await request("/api/collections/comments/records?expand=author", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({ submission: submission.id, author: visitor.id, content: "Useful widget" }),
});
if (comment.author !== visitor.id || comment.expand.author.name !== "widget-visitor") {
  throw new Error("Comment author expansion is incorrect");
}
await expectStatus(
  `/api/collections/comments/records/${comment.id}`,
  { method: "PATCH", headers: authorSession.headers, body: JSON.stringify({ content: "Not mine" }) },
  404,
);
const editedComment = await request(`/api/collections/comments/records/${comment.id}`, {
  method: "PATCH",
  headers: visitorSession.headers,
  body: JSON.stringify({ content: "Useful updated widget" }),
});
if (editedComment.content !== "Useful updated widget") throw new Error("Comment editing failed");

await expectStatus(
  "/api/collections/reports/records",
  {
    method: "POST",
    headers: visitorSession.headers,
    body: JSON.stringify({
      submission: submission.id,
      reporter: author.id,
      category: "other",
      explanation: "Spoofed reporter",
      status: "open",
    }),
  },
  400,
);
const report = await request("/api/collections/reports/records", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({
    submission: submission.id,
    reporter: visitor.id,
    category: "outdated",
    explanation: "Runtime moderation test",
    status: "dismissed",
  }),
});
if (report.category !== "outdated") throw new Error("Outdated Workshop reports must be accepted");
await expectStatus(`/api/collections/reports/records/${report.id}`, { headers: visitorSession.headers }, 404);
await expectStatus("/api/collections/reports/records", { headers: visitorSession.headers }, 200);
const publicReports = await request("/api/collections/reports/records", { headers: visitorSession.headers });
if (publicReports.items.length !== 0) throw new Error("Report details must remain private to Workshop moderators");
const visitorReportSummaries = await request("/api/collections/workshop_report_summaries/records", {
  headers: visitorSession.headers,
});
if (visitorReportSummaries.items.length !== 0) {
  throw new Error("Report explanations must remain private from unrelated Workshop users");
}
const authorReportSummaries = await request("/api/collections/workshop_report_summaries/records", {
  headers: authorSession.headers,
});
if (
  authorReportSummaries.items.length !== 1 ||
  authorReportSummaries.items[0].submission !== submission.id ||
  authorReportSummaries.items[0].explanation !== "Runtime moderation test" ||
  "reporter" in authorReportSummaries.items[0]
) {
  throw new Error("Submission authors must see report reasons without exposing reporter identities");
}
await expectStatus(
  `/api/collections/reports/records/${report.id}`,
  { method: "DELETE", headers: visitorSession.headers },
  404,
);

const promotedAuthor = await request(`/api/collections/users/records/${author.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ isAdmin: true }),
});
if (promotedAuthor.isAdmin !== true) throw new Error("PocketBase superusers must be able to appoint admins");

await expectStatus(
  `/api/collections/comments/records/${comment.id}`,
  { method: "DELETE", headers: authorSession.headers },
  204,
);

const reports = await request("/api/collections/reports/records", { headers: authorSession.headers });
if (reports.items.length !== 1 || reports.items[0].reporter !== visitor.id || reports.items[0].status !== "open") {
  throw new Error("Workshop moderators must be able to review reports");
}
await expectStatus(
  `/api/collections/reports/records/${report.id}`,
  {
    method: "PATCH",
    headers: authorSession.headers,
    body: JSON.stringify({ category: "spam", explanation: "Moderator-authored replacement" }),
  },
  404,
);
const dismissedReport = await request(`/api/collections/reports/records/${report.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ status: "dismissed" }),
});
if (dismissedReport.status !== "dismissed") throw new Error("Workshop moderators must be able to dismiss reports");
const reopenedReport = await request("/api/collections/reports/records", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({
    submission: submission.id,
    reporter: visitor.id,
    category: "malicious",
    explanation: "The later submission revision now needs another review",
    status: "dismissed",
  }),
});
if (reopenedReport.status !== "open" || reopenedReport.id === report.id) {
  throw new Error("A dismissed Workshop report must be replaceable with a fresh open report");
}
const reopenedReports = await request("/api/collections/reports/records", { headers: authorSession.headers });
if (
  reopenedReports.items.length !== 1 ||
  reopenedReports.items[0].id !== reopenedReport.id ||
  reopenedReports.items[0].status !== "open"
) {
  throw new Error("Re-reporting must replace only the reporter's dismissed report");
}

const visitorSubmission = await request("/api/collections/submissions/records", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({
    type: "customWidget",
    title: "Administrator deletion probe",
    content: JSON.stringify(widget),
    widgetSchema: widget.$schema,
    author: visitor.id,
    revision: 1,
    changelog: "Initial publication",
    outdated: false,
  }),
});
await expectStatus(
  `/api/collections/submissions/records/${visitorSubmission.id}`,
  {
    method: "PATCH",
    headers: authorSession.headers,
    body: JSON.stringify({
      title: "Moderator-authored replacement",
      content: JSON.stringify({ ...widget, name: "Moderator-authored replacement" }),
      expectedRevision: 1,
    }),
  },
  404,
);
const moderatedStatus = await request(`/api/collections/submissions/records/${visitorSubmission.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ outdated: true, expectedRevision: 1 }),
});
if (!moderatedStatus.outdated || moderatedStatus.revision !== 2) {
  throw new Error("Workshop moderators must be limited to CAS-protected submission status changes");
}
await expectStatus(
  `/api/collections/submissions/records/${visitorSubmission.id}`,
  { method: "DELETE", headers: authorSession.headers },
  204,
);
await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "DELETE", headers: authorSession.headers },
  204,
);

console.log("Workshop PocketBase integration passed");
