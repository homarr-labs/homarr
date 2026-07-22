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
for (const required of ["submissions", "votes", "comments", "reports", "workshop_listings"]) {
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
    widgetSchema: "homarr-custom-css-v1",
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
  throw new Error("Submission publication was not validated and normalized server-side");
}
await expectStatus(
  "/api/collections/submissions/records",
  {
    method: "POST",
    headers: visitorSession.headers,
    body: JSON.stringify({
      type: "customCss",
      title: "Oversized stylesheet",
      content: "x".repeat(16_385),
      widgetSchema: "homarr-custom-widget-v2",
      author: visitor.id,
    }),
  },
  400,
);
await expectStatus(
  "/api/collections/submissions/records",
  {
    method: "POST",
    headers: visitorSession.headers,
    body: JSON.stringify({
      type: "customWidget",
      title: "Invalid widget payload",
      content: ".dashboard { color: red; }",
      widgetSchema: "homarr-custom-widget-v2",
      author: visitor.id,
    }),
  },
  400,
);
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
  listing.authorName !== "Widget Author" ||
  listing.widgetSchema !== widget.$schema
) {
  throw new Error("Workshop listing data is incorrect");
}

const comment = await request("/api/collections/comments/records?expand=author", {
  method: "POST",
  headers: visitorSession.headers,
  body: JSON.stringify({ submission: submission.id, author: visitor.id, content: "Useful widget" }),
});
if (comment.author !== visitor.id || comment.expand.author.displayName !== "Widget Visitor") {
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
    category: "other",
    explanation: "Runtime moderation test",
    status: "dismissed",
  }),
});
await expectStatus(`/api/collections/reports/records/${report.id}`, { headers: visitorSession.headers }, 404);
await expectStatus("/api/collections/reports/records", { headers: visitorSession.headers }, 200);
const publicReports = await request("/api/collections/reports/records", { headers: visitorSession.headers });
if (publicReports.items.length !== 0) throw new Error("Report details must remain private to Workshop administrators");
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
  throw new Error("Workshop administrators must be able to review reports");
}
const dismissedReport = await request(`/api/collections/reports/records/${report.id}`, {
  method: "PATCH",
  headers: authorSession.headers,
  body: JSON.stringify({ status: "dismissed" }),
});
if (dismissedReport.status !== "dismissed") throw new Error("Workshop administrators must be able to dismiss reports");

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
  { method: "DELETE", headers: authorSession.headers },
  204,
);
await expectStatus(
  `/api/collections/submissions/records/${submission.id}`,
  { method: "DELETE", headers: authorSession.headers },
  204,
);

console.log("Workshop PocketBase integration passed");
