const baseUrl = process.env.WORKSHOP_TEST_URL ?? "http://127.0.0.1:18090";

const createSseReader = (body) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  return {
    cancel: () => reader.cancel(),
    async next() {
      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const result = { event: "message", id: "", data: "" };
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) result.event = line.slice(6).trim();
            if (line.startsWith("id:")) result.id = line.slice(3).trim();
            if (line.startsWith("data:")) result.data += line.slice(5).trim();
          }
          if (result.data || result.id) return result;
          continue;
        }
        const chunk = await reader.read();
        if (chunk.done) throw new Error("PocketBase realtime stream ended unexpectedly");
        buffer += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n");
      }
    },
  };
};

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
  "assistant_requests",
  "assistant_activity",
]) {
  if (!collectionNames.has(required)) throw new Error(`Missing Workshop collection: ${required}`);
}
for (const removed of ["workshop_admin_actions", "workshop_admins"]) {
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

const modelList = await request("/api/ai/v1/models");
if (
  modelList.object !== "list" ||
  modelList.data.length !== 1 ||
  modelList.data[0].id !== "homarr/deepseek-v4-flash-latest"
) {
  throw new Error("The Homarr provider must advertise exactly one model");
}
await expectStatus("/api/ai/usage", {}, 401);

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

await expectStatus(
  "/api/ai/v1/chat/completions",
  {
    method: "POST",
    headers: authorSession.headers,
    body: JSON.stringify({
      model: "homarr/deepseek-v4-flash-latest",
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

const realtimeResponse = await fetch(`${baseUrl}/api/realtime`);
if (!realtimeResponse.ok || !realtimeResponse.body) throw new Error("PocketBase realtime connection failed");
const realtime = createSseReader(realtimeResponse.body);
const connectedEvent = await realtime.next();
if (connectedEvent.event !== "PB_CONNECT" || !connectedEvent.id) {
  throw new Error("PocketBase realtime did not provide a client ID");
}
await request("/api/realtime", {
  method: "POST",
  body: JSON.stringify({ clientId: connectedEvent.id, subscriptions: ["assistant_activity/*"] }),
});
const activityEvent = (async () => {
  while (true) {
    const event = await realtime.next();
    const payload = JSON.parse(event.data);
    if (payload.action === "create") return payload.record;
  }
})();

const streamStartedAt = performance.now();
const streamResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...authorSession.headers },
  body: JSON.stringify({
    model: "homarr/deepseek-v4-flash-latest",
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
  dataFrames.length < 3 ||
  dataFrames.at(-1)?.trim() !== "data: [DONE]" ||
  firstChunkAt - streamStartedAt > 5_000
) {
  throw new Error("The Homarr provider did not preserve the upstream SSE stream");
}
const liveActivity = await Promise.race([
  activityEvent,
  new Promise((_, reject) => setTimeout(() => reject(new Error("Assistant activity realtime event timed out")), 2_000)),
]);
await realtime.cancel();
if (liveActivity.model !== "homarr/deepseek-v4-flash-latest" || liveActivity.requestUnits !== 1) {
  throw new Error("The public assistant activity event is invalid");
}

const toolResponse = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...authorSession.headers },
  body: JSON.stringify({
    model: "homarr/deepseek-v4-flash-latest",
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
  }),
});
if (!toolResponse.ok || toolResponse.headers.get("x-homarr-quota-remaining") !== "46") {
  throw new Error("Tool results must each consume one Homarr provider request unit");
}

const afterToolsUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (afterToolsUsage.used !== 4 || afterToolsUsage.remaining !== 46) {
  throw new Error(`Tool request accounting is incorrect: ${JSON.stringify(afterToolsUsage)}`);
}

const upstreamFailure = await fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json", ...authorSession.headers },
  body: JSON.stringify({
    model: "homarr/deepseek-v4-flash-latest",
    messages: [{ role: "user", content: "upstream failure" }],
    stream: false,
  }),
});
if (upstreamFailure.status !== 503 || upstreamFailure.headers.get("x-homarr-quota-remaining") !== "46") {
  throw new Error("Failed upstream requests must refund their Homarr provider allowance");
}
const afterFailureUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (afterFailureUsage.used !== 4 || afterFailureUsage.remaining !== 46) {
  throw new Error(`Failed upstream request was charged: ${JSON.stringify(afterFailureUsage)}`);
}

const publicActivities = await request("/api/collections/assistant_activity/records?sort=-created&perPage=10");
if (
  publicActivities.items.length < 2 ||
  publicActivities.items.some((item) => "user" in item) ||
  !publicActivities.items.some(
    (item) => item.status === "completed" && item.inputTokens === 12 && item.outputTokens === 7,
  )
) {
  throw new Error("Public assistant activity must be anonymous and include completed token totals");
}
await expectStatus(
  "/api/collections/assistant_activity/records",
  {
    method: "POST",
    body: JSON.stringify({
      status: "completed",
      model: "forged",
      requestUnits: 1,
    }),
  },
  403,
);
await expectStatus("/api/collections/assistant_requests/records", { headers: authorSession.headers }, 403);
await expectStatus("/api/collections/assistant_quotas/records", { headers: authorSession.headers }, 403);

const privateRequests = await request("/api/collections/assistant_requests/records?perPage=20", {
  headers: rootHeaders,
});
if (
  privateRequests.items.length < 2 ||
  privateRequests.items.some((item) => item.user !== author.id) ||
  privateRequests.items.some((item) => "messages" in item || "prompt" in item || "body" in item)
) {
  throw new Error("Private provider accounting must identify the user without storing request content");
}
const requestToRetain = privateRequests.items.find((item) => item.publicActivity);
if (!requestToRetain) throw new Error("Expected a private request linked to public activity");
await request(`/api/collections/assistant_activity/records/${requestToRetain.publicActivity}`, {
  method: "DELETE",
  headers: rootHeaders,
});
const retainedRequest = await request(`/api/collections/assistant_requests/records/${requestToRetain.id}`, {
  headers: rootHeaders,
});
if (retainedRequest.id !== requestToRetain.id || retainedRequest.publicActivity) {
  throw new Error("Pruning public activity must retain private accounting records");
}
const quotas = await request("/api/collections/assistant_quotas/records?perPage=20", { headers: rootHeaders });
const authorQuota = quotas.items.find((item) => item.user === author.id);
if (!authorQuota || authorQuota.dailyLimit !== 50 || authorQuota.used !== 4 || authorQuota.totalTokens !== 38) {
  throw new Error(`Private provider quota is incorrect: ${JSON.stringify(authorQuota)}`);
}

await request(`/api/collections/assistant_quotas/records/${authorQuota.id}`, {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ day: "2000-01-01", used: 49, dailyLimit: 2 }),
});
const resetUsage = await request("/api/ai/usage", { headers: authorSession.headers });
if (resetUsage.limit !== 2 || resetUsage.used !== 0 || resetUsage.remaining !== 2) {
  throw new Error(`Quota did not reset at the UTC day boundary: ${JSON.stringify(resetUsage)}`);
}

const allowanceProbe = () =>
  fetch(`${baseUrl}/api/ai/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authorSession.headers },
    body: JSON.stringify({
      model: "homarr/deepseek-v4-flash-latest",
      messages: [{ role: "user", content: "allowance probe" }],
      stream: false,
    }),
  });
const concurrentAllowanceResponses = await Promise.all([allowanceProbe(), allowanceProbe(), allowanceProbe()]);
const concurrentStatuses = concurrentAllowanceResponses.map((response) => response.status).toSorted();
const exhaustedResponse = concurrentAllowanceResponses.find((response) => response.status === 429);
if (
  concurrentStatuses.join(",") !== "200,200,429" ||
  exhaustedResponse?.headers.get("x-homarr-quota-remaining") !== "0" ||
  !exhaustedResponse.headers.get("x-homarr-quota-reset")
) {
  throw new Error("The per-user allowance was not enforced atomically");
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
