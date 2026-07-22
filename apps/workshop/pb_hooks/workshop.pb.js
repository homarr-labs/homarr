/// <reference path="../pb_data/types.d.ts" />

const CUSTOM_WIDGET_SCHEMA = "homarr-custom-widget-v2";
const CUSTOM_CSS_SCHEMA = "homarr-custom-css-v1";
const MAX_CSS_LENGTH = 16_384;
const MAX_CONTENT_LENGTH = 1_000_000;

const rejectRequest = (message) => {
  throw new BadRequestError(message);
};

const requestBodyValue = (event, name) => {
  const body = event.requestInfo().body;
  return body && typeof body.get === "function" ? body.get(name) : body ? body[name] : undefined;
};

const validateWidgetManifest = (content) => {
  let widget;
  try {
    widget = JSON.parse(content);
  } catch {
    rejectRequest("Widget content must be valid JSON");
  }
  if (!widget || Array.isArray(widget) || typeof widget !== "object") rejectRequest("Widget must be a JSON object");
  if (widget.$schema !== CUSTOM_WIDGET_SCHEMA) rejectRequest("Widget schema is not supported");
  if (typeof widget.name !== "string" || !widget.name.trim() || widget.name.length > 100)
    rejectRequest("Widget name is invalid");
  if (!widget.sources || Array.isArray(widget.sources) || typeof widget.sources !== "object" || !widget.sources.default)
    rejectRequest("Widget must define a default source");
  if (Object.keys(widget.sources).length > 8) rejectRequest("Widget has too many sources");
  for (const source of Object.values(widget.sources)) {
    if (!source || Array.isArray(source) || typeof source !== "object") rejectRequest("Widget source is invalid");
    if (typeof source.baseUrl !== "string" || !/^https?:\/\//.test(source.baseUrl))
      rejectRequest("Widget source URL is invalid");
    if (!["public", "private", "loopback"].includes(source.networkScope))
      rejectRequest("Widget source network scope is invalid");
  }
  if (!widget.requests || Array.isArray(widget.requests) || typeof widget.requests !== "object")
    rejectRequest("Widget requests are invalid");
  if (!widget.options || Array.isArray(widget.options) || typeof widget.options !== "object")
    rejectRequest("Widget options are invalid");
  if (typeof widget.template !== "string" || !widget.template.trim()) rejectRequest("Widget template is invalid");
  return JSON.stringify(widget);
};

const validateAndNormalizeSubmission = (record) => {
  const type = record.getString("type");
  const content = record.getString("content");
  if (!content || content.length > MAX_CONTENT_LENGTH) rejectRequest("Submission content is invalid");
  record.set("title", record.getString("title").trim());
  record.set("description", record.getString("description").trim());
  record.set("changelog", record.getString("changelog").trim());
  if (type === "customCss") {
    if (!content.trim() || content.length > MAX_CSS_LENGTH) rejectRequest("Custom CSS is empty or too large");
    record.set("widgetSchema", CUSTOM_CSS_SCHEMA);
    return;
  }
  if (type !== "customWidget") rejectRequest("Submission type is invalid");
  record.set("content", validateWidgetManifest(content));
  record.set("widgetSchema", CUSTOM_WIDGET_SCHEMA);
};

onBootstrap((event) => {
  event.next();
  const users = event.app.findCollectionByNameOrId("users");
  const clientId = String($os.getenv("GITHUB_CLIENT_ID") || "").trim();
  const clientSecret = String($os.getenv("GITHUB_CLIENT_SECRET") || "").trim();
  const configured = Boolean(clientId && clientSecret);
  users.oauth2.enabled = configured;
  users.oauth2.providers = configured ? [{ name: "github", clientId, clientSecret }] : [];
  event.app.save(users);
});

onRecordCreateRequest((event) => {
  validateAndNormalizeSubmission(event.record);
  event.record.set("revision", 1);
  event.record.set("changelog", "");
  event.record.set("outdated", false);
  event.next();
}, "submissions");

onRecordUpdateRequest((event) => {
  const original = event.record.original();
  const currentRevision = original.getInt("revision");
  const expectedRevision = Number(requestBodyValue(event, "expectedRevision"));
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== currentRevision) {
    rejectRequest("Submission changed since it was read");
  }
  validateAndNormalizeSubmission(event.record);
  event.record.set("revision", currentRevision + 1);
  event.next();
}, "submissions");

onRecordCreateRequest((event) => {
  event.record.set("status", "open");
  event.next();
}, "reports");

onRecordAfterCreateSuccess((event) => {
  try {
    const votes = event.app.findCollectionByNameOrId("votes");
    const vote = new Record(votes);
    vote.set("submission", event.record.id);
    vote.set("user", event.record.get("author"));
    vote.set("value", 1);
    event.app.save(vote);
  } catch (error) {
    console.log(`Workshop initial upvote failed for ${event.record.id}: ${error}`);
  }
  event.next();
}, "submissions");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const emailTemplate = (filename) => {
  const hooksPath = $os.getenv("WORKSHOP_PB_HOOKS_DIR") || $filepath.dirname(__filepath);
  return $os.readFile($filepath.join(hooksPath, filename));
};

const sendEmail = (app, recipientEmail, subject, text, html) => {
  const sender = app.settings().meta;
  app.newMailClient().send(
    new MailerMessage({
      from: { address: sender.senderAddress, name: sender.senderName },
      to: [{ address: recipientEmail }],
      subject,
      text,
      html,
    }),
  );
};

onRecordAfterCreateSuccess((event) => {
  try {
    const submission = event.app.findRecordById("submissions", event.record.get("submission"));
    const recipient = event.app.findRecordById("users", submission.get("author"));
    const commenter = event.app.findRecordById("users", event.record.get("author"));
    const recipientEmail = recipient.email();
    const publicOrigin = $os.getenv("WORKSHOP_PUBLIC_ORIGIN").replace(/\/$/, "");

    if (!recipientEmail || recipient.id === commenter.id || !publicOrigin) {
      event.next();
      return;
    }

    const commenterName = commenter.getString("displayName") || "A community member";
    const submissionTitle = submission.getString("title");
    const rawExcerpt = event.record.getString("content").slice(0, 280);
    const submissionUrl = `${publicOrigin}/workshop/${submission.id}/`;
    const template = emailTemplate("comment-email.html")
      .replaceAll("{{commenterName}}", escapeHtml(commenterName))
      .replaceAll("{{submissionTitle}}", escapeHtml(submissionTitle))
      .replaceAll("{{commentExcerpt}}", escapeHtml(rawExcerpt))
      .replaceAll("{{submissionUrl}}", escapeHtml(submissionUrl));

    sendEmail(
      event.app,
      recipientEmail,
      `${commenterName} commented on ${submissionTitle}`,
      `${commenterName} commented on “${submissionTitle}”:\n\n${rawExcerpt}\n\n${submissionUrl}`,
      template,
    );
  } catch (error) {
    console.log(`Workshop comment email failed for ${event.record.id}: ${error}`);
  }
  event.next();
}, "comments");

onRecordAfterCreateSuccess((event) => {
  try {
    const submission = event.app.findRecordById("submissions", event.record.get("submission"));
    const reporter = event.app.findRecordById("users", event.record.get("reporter"));
    const publicOrigin = $os.getenv("WORKSHOP_PUBLIC_ORIGIN").replace(/\/$/, "");
    const admins = event.app.findRecordsByFilter("users", "isAdmin = true && email != ''", "", 100, 0);

    if (!publicOrigin || admins.length === 0) {
      event.next();
      return;
    }

    const reporterName = reporter.getString("displayName") || "A community member";
    const submissionTitle = submission.getString("title");
    const category = event.record.getString("category");
    const explanation = event.record.getString("explanation");
    const adminUrl = `${publicOrigin}/workshop/admin`;
    const submissionUrl = `${publicOrigin}/workshop/${submission.id}/`;
    const template = emailTemplate("report-email.html")
      .replaceAll("{{reporterName}}", escapeHtml(reporterName))
      .replaceAll("{{submissionTitle}}", escapeHtml(submissionTitle))
      .replaceAll("{{category}}", escapeHtml(category))
      .replaceAll("{{explanation}}", escapeHtml(explanation))
      .replaceAll("{{adminUrl}}", escapeHtml(adminUrl))
      .replaceAll("{{submissionUrl}}", escapeHtml(submissionUrl));

    for (const admin of admins) {
      try {
        sendEmail(
          event.app,
          admin.email(),
          `Workshop report: ${submissionTitle}`,
          `${reporterName} reported “${submissionTitle}” for ${category}.\n\n${explanation}\n\nReview: ${adminUrl}`,
          template,
        );
      } catch (error) {
        console.log(`Workshop report email failed for admin ${admin.id}: ${error}`);
      }
    }
  } catch (error) {
    console.log(`Workshop report email failed for ${event.record.id}: ${error}`);
  }
  event.next();
}, "reports");

onRecordDeleteRequest((event) => {
  const submissionId = event.record.id;
  const submissionTitle = event.record.getString("title");
  const authorId = event.record.get("author");
  const actor = event.requestInfo().auth;
  const notifyAuthor = actor && actor.getBool("isAdmin") && actor.id !== authorId;

  event.next();

  if (!notifyAuthor) return;

  try {
    const author = event.app.findRecordById("users", authorId);
    const recipientEmail = author.email();
    if (!recipientEmail) return;

    const publicOrigin = $os.getenv("WORKSHOP_PUBLIC_ORIGIN").replace(/\/$/, "");
    const workshopUrl = publicOrigin ? `${publicOrigin}/workshop/` : "";
    const template = emailTemplate("submission-deleted-email.html").replaceAll(
      "{{submissionTitle}}",
      escapeHtml(submissionTitle),
    );
    const text = `A Workshop administrator removed your submission “${submissionTitle}”.${
      workshopUrl ? `\n\nReturn to Workshop: ${workshopUrl}` : ""
    }`;

    sendEmail(event.app, recipientEmail, `Your Workshop submission was removed`, text, template);
  } catch (error) {
    console.log(`Workshop deletion email failed for ${submissionId}: ${error}`);
  }
}, "submissions");
