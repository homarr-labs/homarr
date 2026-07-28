const CUSTOM_WIDGET_SCHEMA = "homarr-custom-widget-v2";
const CUSTOM_CSS_SCHEMA = "homarr-custom-css-v1";
const MAX_CSS_LENGTH = 16_384;
const MAX_CONTENT_LENGTH = 1_000_000;
const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const rejectRequest = (message) => {
  throw new BadRequestError(message);
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
  const { validateWidgetManifest } = require(`${__hooks}/widget-validator.js`);
  record.set("content", validateWidgetManifest(content));
  record.set("widgetSchema", CUSTOM_WIDGET_SCHEMA);
};

const normalizedIdentityText = (...values) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const deriveGithubIdentity = (oauthUser, recordId) => {
  const rawUser = oauthUser && typeof oauthUser.rawUser === "object" ? oauthUser.rawUser : {};
  const candidateUsername = normalizedIdentityText(oauthUser && oauthUser.username, rawUser.login);
  const githubUsername =
    GITHUB_USERNAME_PATTERN.test(candidateUsername) && !candidateUsername.includes("--") ? candidateUsername : "";
  const displayName =
    normalizedIdentityText(oauthUser && oauthUser.name, rawUser.name, githubUsername, rawUser.login).slice(0, 100) ||
    `GitHub user ${String(recordId || "").slice(0, 8)}`;
  const candidateAvatarUrl = normalizedIdentityText(
    oauthUser && oauthUser.avatarURL,
    oauthUser && oauthUser.avatarUrl,
    rawUser.avatar_url,
  );
  const avatarUrl =
    candidateAvatarUrl.length <= 2_048 && /^https:\/\/[^"'\\\s]+$/i.test(candidateAvatarUrl) ? candidateAvatarUrl : "";

  return {
    displayName,
    avatarUrl,
    githubUsername,
    githubProfileUrl: githubUsername ? `https://github.com/${githubUsername}` : "",
  };
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
  deriveGithubIdentity,
  emailTemplate,
  escapeHtml,
  rejectRequest,
  sendEmail,
  validateAndNormalizeSubmission,
};
