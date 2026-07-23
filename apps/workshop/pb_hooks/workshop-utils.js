const CUSTOM_WIDGET_SCHEMA = "homarr-custom-widget-v2";
const CUSTOM_CSS_SCHEMA = "homarr-custom-css-v1";
const MAX_CSS_LENGTH = 16_384;
const MAX_CONTENT_LENGTH = 1_000_000;

const rejectRequest = (message) => {
  throw new BadRequestError(message);
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

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const emailTemplate = (filename) => {
  const hooksPath = $os.getenv("WORKSHOP_PB_HOOKS_DIR") || __hooks;
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

module.exports = {
  emailTemplate,
  escapeHtml,
  rejectRequest,
  sendEmail,
  validateAndNormalizeSubmission,
};
