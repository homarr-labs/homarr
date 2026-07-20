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
for (const required of ["submissions", "votes", "reports", "workshop_listings"]) {
  if (!collectionNames.has(required)) throw new Error(`Missing Workshop collection: ${required}`);
}
for (const removed of ["comments", "workshop_admin_actions", "workshop_admins"]) {
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

const createUser = async (email, displayName, password, extra = {}) =>
  request("/api/collections/users/records", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({
      email,
      emailVisibility: false,
      verified: true,
      password,
      passwordConfirm: password,
      displayName,
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
const author = await createUser("widget-author@example.invalid", "Widget Author", authorPassword);
const authorSession = await signIn(author.email, authorPassword);
await expectStatus(
  `/api/collections/users/records/${author.id}`,
  { method: "PATCH", headers: authorSession.headers, body: JSON.stringify({ isAdmin: true }) },
  404,
);

const visitorPassword = "WorkshopVisitor123!";
const visitor = await createUser("widget-visitor@example.invalid", "Widget Visitor", visitorPassword);
const visitorSession = await signIn(visitor.email, visitorPassword);

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
  headers: authorSession.headers,
  body: JSON.stringify({
    title: "Workshop runtime probe",
    description: "PocketBase integration test",
    widgetSchema: widget.$schema,
    content: JSON.stringify(widget),
    author: author.id,
  }),
});
if (
  submission.author !== author.id ||
  submission.title !== "Workshop runtime probe" ||
  submission.widgetSchema !== widget.$schema
) {
  throw new Error("Submission publication failed");
}

const updatedSubmission = await request(`/api/collections/submissions/records/${submission.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ title: "Updated runtime probe" }),
});
if (updatedSubmission.title !== "Updated runtime probe")
  throw new Error("Authors must be able to edit their submission");

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
  listing.score !== 1 ||
  listing.upvotes !== 1 ||
  listing.downvotes !== 0 ||
  listing.authorName !== "Widget Author" ||
  listing.widgetSchema !== widget.$schema
) {
  throw new Error("Workshop listing data is incorrect");
}

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
    category: "other",
    explanation: "Runtime moderation test",
  }),
});
const ownReport = await request(`/api/collections/reports/records/${report.id}`, { headers: visitorSession.headers });
if (ownReport.reporter !== visitor.id) throw new Error("Reporters must be able to view their own report");
const hiddenReports = await request("/api/collections/reports/records", { headers: visitorSession.headers });
if (hiddenReports.items.length !== 0) throw new Error("Regular users must not list moderation reports");
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

const reports = await request("/api/collections/reports/records", { headers: authorSession.headers });
if (reports.items.length !== 1 || reports.items[0].reporter !== visitor.id) {
  throw new Error("Workshop administrators must be able to review reports");
}
await expectStatus(
  `/api/collections/reports/records/${report.id}`,
  { method: "DELETE", headers: authorSession.headers },
  204,
);

const visitorSubmission = await request("/api/collections/submissions/records", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({
    title: "Administrator deletion probe",
    content: JSON.stringify(widget),
    widgetSchema: widget.$schema,
    author: visitor.id,
  }),
});
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
