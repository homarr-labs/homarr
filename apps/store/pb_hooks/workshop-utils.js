const WIDGET_SCHEMA = "homarr-custom-widget-v2";
const CSS_SCHEMA = "homarr-custom-css-v1";
const CSS_LIMIT = 16384;
const WIDGET_AUTH_TYPES = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"];
const WIDGET_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const WIDGET_DISPLAY_TYPES = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
  "customJsx",
];

function fail(ErrorType, _code, message) {
  throw new ErrorType(message);
}

function requireWritableAccount(app, auth, posting) {
  if (!auth) fail(UnauthorizedError, "authentication_required", "Authentication is required");
  const account = app.findRecordById("users", auth.id);
  if (account.getString("state") === "disabled") fail(ForbiddenError, "account_disabled", "Account is disabled");
  if (posting && account.getString("state") === "posting_banned")
    fail(ForbiddenError, "posting_banned", "Account cannot publish submissions");
  return account;
}

function validateSubmission(record) {
  const type = record.getString("type");
  const content = record.getString("content");
  if (type === "css") {
    if (!content.trim()) fail(BadRequestError, "invalid_submission", "CSS cannot be empty");
    if (content.length > CSS_LIMIT) fail(BadRequestError, "invalid_submission", "CSS is too large");
    record.set("schemaVersion", CSS_SCHEMA);
    return;
  }
  if (type !== "widget") fail(BadRequestError, "invalid_submission", "Unsupported submission type");
  let widget;
  try {
    widget = JSON.parse(content);
  } catch {
    fail(BadRequestError, "invalid_submission", "Widget content is not valid JSON");
  }
  if (
    !widget ||
    widget.$schema !== WIDGET_SCHEMA ||
    typeof widget.name !== "string" ||
    widget.name.length < 1 ||
    widget.name.length > 128 ||
    typeof widget.url !== "string" ||
    widget.url.length < 1 ||
    !WIDGET_AUTH_TYPES.includes(widget.authType) ||
    !WIDGET_METHODS.includes(widget.method) ||
    !WIDGET_DISPLAY_TYPES.includes(widget.displayType) ||
    typeof widget.displayConfig !== "object" ||
    Array.isArray(widget.displayConfig) ||
    Object.prototype.hasOwnProperty.call(widget, "secrets")
  ) {
    fail(BadRequestError, "invalid_submission", "Widget does not match homarr-custom-widget-v2");
  }
  if (!widget.displayConfig || widget.displayConfig.type !== widget.displayType) {
    fail(BadRequestError, "invalid_submission", "Widget displayConfig.type must match displayType");
  }
  record.set("schemaVersion", WIDGET_SCHEMA);
}

function snapshot(record) {
  return JSON.stringify(record.publicExport());
}

function requireStaff(app, auth) {
  const account = requireWritableAccount(app, auth, false);
  const role = account.getString("role");
  if (role !== "moderator" && role !== "admin") fail(ForbiddenError, "forbidden", "Staff access is required");
  return role;
}

function body(e) {
  const data = new DynamicModel({ reason: "", state: "", role: "", status: "" });
  e.bindBody(data);
  if (!data.reason || data.reason.trim().length < 3)
    fail(BadRequestError, "invalid_submission", "A reason is required");
  return data;
}

function audit(app, actor, action, targetType, targetId, reason, targetSnapshot) {
  const collection = app.findCollectionByNameOrId("moderation_actions");
  const record = new Record(collection);
  record.set("actor", actor.id);
  record.set("action", action);
  record.set("targetType", targetType);
  record.set("targetId", targetId);
  record.set("reason", reason.trim());
  record.set("snapshot", targetSnapshot || "");
  app.save(record);
}

module.exports = { audit, body, fail, requireStaff, requireWritableAccount, snapshot, validateSubmission };
