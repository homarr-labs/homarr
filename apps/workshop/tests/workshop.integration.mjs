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
  if (response.status !== expected) throw new Error(`Expected ${expected} for ${path}, received ${response.status}`);
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
  "reports",
  "workshop_admins",
  "workshop_admin_actions",
  "workshop_listings",
]) {
  if (!collectionNames.has(required)) throw new Error(`Missing Workshop collection: ${required}`);
}

// Workshop production authentication is GitHub OAuth. Password auth is enabled only in this disposable test database.
const usersCollection = await request("/api/collections/users", { headers: rootHeaders });
await request("/api/collections/users", {
  method: "PATCH",
  headers: rootHeaders,
  body: JSON.stringify({ ...usersCollection, passwordAuth: { enabled: true, identityFields: ["email"] } }),
});

const password = "WorkshopAuthor123!";
const user = await request("/api/collections/users/records", {
  method: "POST",
  headers: rootHeaders,
  body: JSON.stringify({
    email: "widget-author@example.invalid",
    emailVisibility: false,
    verified: true,
    password,
    passwordConfirm: password,
    displayName: "Widget Author",
  }),
});
await request("/api/collections/workshop_admins/records", {
  method: "POST",
  headers: rootHeaders,
  body: JSON.stringify({ user: user.id }),
});
const auth = await request("/api/collections/users/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: user.email, password }),
});
const userHeaders = { authorization: `Bearer ${auth.token}` };

const widget = {
  $schema: "homarr-custom-widget-v2",
  name: "Workshop runtime probe",
  sources: [
    {
      id: "default",
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: { type: "none" },
    },
  ],
  requests: [],
  optionsSchema: { type: "object", properties: {}, additionalProperties: false },
  defaultOptions: {},
  template: "<Text>Runtime probe</Text>",
};
const submission = await request("/api/collections/submissions/records", {
  method: "POST",
  headers: userHeaders,
  body: JSON.stringify({
    title: "Workshop runtime probe",
    description: "PocketBase integration test",
    content: JSON.stringify(widget),
    changelog: "Initial",
    author: user.id,
  }),
});
if (submission.revision !== 1 || submission.authorName !== "Widget Author" || submission.contentHash.length !== 64) {
  throw new Error("Submission hooks did not normalize publication metadata");
}

await expectStatus(
  "/api/collections/submissions/records",
  {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      title: "Removed format",
      content: JSON.stringify({ displayType: "raw", displayConfig: { type: "raw" } }),
      author: user.id,
    }),
  },
  400,
);

await expectStatus(
  "/api/collections/submissions/records",
  {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      title: "Unsafe authentication header",
      content: JSON.stringify({
        ...widget,
        sources: [{ ...widget.sources[0], auth: { type: "apiKeyHeader", headerName: "X-Forwarded-Authorization" } }],
      }),
    }),
  },
  400,
);

await expectStatus(
  "/api/collections/submissions/records",
  {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      title: "Unknown template request",
      content: JSON.stringify({ ...widget, template: '<SubFetch requestId="missing" />' }),
    }),
  },
  400,
);

const updatedWidget = { ...widget, description: "Updated definition" };
const updatedSubmission = await request(`/api/collections/submissions/records/${submission.id}`, {
  method: "PATCH",
  headers: userHeaders,
  body: JSON.stringify({ content: JSON.stringify(updatedWidget), changelog: "Updated" }),
});
if (updatedSubmission.revision !== 2) throw new Error("Content edits must increment the submission revision");

await request("/api/collections/votes/records", {
  method: "POST",
  headers: userHeaders,
  body: JSON.stringify({ submission: submission.id, user: user.id, value: 1 }),
});
await expectStatus(
  "/api/collections/votes/records",
  {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({ submission: submission.id, user: user.id, value: 1 }),
  },
  400,
);
const listing = await request(`/api/collections/workshop_listings/records/${submission.id}`);
if (listing.score !== 1 || listing.upvotes !== 1 || listing.downvotes !== 0) {
  throw new Error("Workshop listing vote totals are incorrect");
}

const report = await request("/api/collections/reports/records", {
  method: "POST",
  headers: userHeaders,
  body: JSON.stringify({
    submission: submission.id,
    reporter: user.id,
    category: "other",
    explanation: "Runtime moderation test",
    status: "dismissed",
  }),
});
const reports = await request("/api/collections/reports/records?filter=status%3D%27open%27", {
  headers: userHeaders,
});
if (reports.items.length !== 1 || reports.items[0].reporter !== user.id) {
  throw new Error("Workshop administrators cannot inspect open reports and reporters");
}

await request(`/api/collections/reports/records/${report.id}`, {
  method: "PATCH",
  headers: userHeaders,
  body: JSON.stringify({ status: "dismissed", dismissalReason: "Runtime test complete" }),
});
const actions = await request("/api/collections/workshop_admin_actions/records", { headers: userHeaders });
if (!actions.items.some((action) => action.action === "dismiss_report" && action.reportId === report.id)) {
  throw new Error("Workshop report dismissal was not audited");
}

const authorPassword = "WorkshopSecondAuthor123!";
const secondAuthor = await request("/api/collections/users/records", {
  method: "POST",
  headers: rootHeaders,
  body: JSON.stringify({
    email: "second-widget-author@example.invalid",
    emailVisibility: false,
    verified: true,
    password: authorPassword,
    passwordConfirm: authorPassword,
    displayName: "Second Author",
  }),
});
const secondAuth = await request("/api/collections/users/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: secondAuthor.email, password: authorPassword }),
});
const secondHeaders = { authorization: `Bearer ${secondAuth.token}` };
const secondSubmission = await request("/api/collections/submissions/records", {
  method: "POST",
  headers: secondHeaders,
  body: JSON.stringify({
    title: "Administrator deletion probe",
    content: JSON.stringify(widget),
    author: secondAuthor.id,
  }),
});
await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "DELETE", headers: secondHeaders },
  404,
);
await expectStatus(
  `/api/collections/submissions/records/${secondSubmission.id}`,
  { method: "DELETE", headers: userHeaders },
  204,
);
const deletionActions = await request("/api/collections/workshop_admin_actions/records", { headers: userHeaders });
if (
  !deletionActions.items.some(
    (action) => action.action === "delete_submission" && action.submissionId === secondSubmission.id,
  )
) {
  throw new Error("Workshop administrator deletion was not audited");
}

console.log("Workshop PocketBase integration passed");
