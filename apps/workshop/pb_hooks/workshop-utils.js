const rejectRequest = (message) => {
  throw new BadRequestError(message);
};

const isManifestObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isManifestString = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const isManifestMap = (value, max) =>
  isManifestObject(value) &&
  Object.keys(value).length <= max &&
  Object.entries(value).every(([key, entry]) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key) && isManifestObject(entry));

const isManifestHttpUrl = (value) => {
  if (!isManifestString(value, 2048) || !/^https?:\/\//i.test(value)) return false;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (!authority || authority.includes("@") || /\?[^#]+|#[\s\S]+/.test(value)) return false;
  const field = new URLField({ name: "baseUrl", required: true });
  const record = new Record(new Collection());
  record.set("baseUrl", value);
  try {
    field.validateValue(new Context(), $app, record);
    return true;
  } catch {
    return false;
  }
};

const validateSubmissionManifest = (record) => {
  const type = record.getString("type");
  const schema = record.getString("widgetSchema");
  const content = record.getString("content");
  const supportedSchema =
    type === "customWidget" ? "homarr-custom-widget-v2" : type === "customCss" ? "homarr-custom-css-v1" : null;
  if (!supportedSchema || schema !== supportedSchema) {
    rejectRequest("Unsupported Workshop submission schema for this type");
  }
  if (type === "customCss") {
    if (!isManifestString(content, 16_384)) rejectRequest("CSS must be nonempty and at most 16384 characters");
    return;
  }
  if (content.length > 1_000_000) rejectRequest("Widget content must be at most 1000000 characters");
  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch {
    rejectRequest("Widget content must be valid JSON");
  }
  if (!isManifestObject(manifest) || manifest.$schema !== schema) {
    rejectRequest("Widget manifest schema must match the supported listing schema");
  }
  if (
    !isManifestString(manifest.name, 128) ||
    !isManifestString(manifest.template, 50_000) ||
    (manifest.description !== undefined &&
      (typeof manifest.description !== "string" || manifest.description.length > 512)) ||
    (manifest.iconUrl !== undefined && !isManifestString(manifest.iconUrl, 2048))
  ) {
    rejectRequest("Widget manifest has invalid name, template, description or iconUrl fields");
  }
  if (
    !isManifestMap(manifest.sources, 8) ||
    !Object.prototype.hasOwnProperty.call(manifest.sources, "default") ||
    !isManifestMap(manifest.requests, 64) ||
    (manifest.options !== undefined && !isManifestMap(manifest.options, 64))
  ) {
    rejectRequest("Widget manifest requires keyed sources with a default source, requests and optional options");
  }
  for (const source of Object.values(manifest.sources)) {
    const validSource =
      source.type === "integration"
        ? isManifestString(source.integrationKind, 128)
        : (source.type === undefined || source.type === "http") &&
          isManifestHttpUrl(source.baseUrl) &&
          ["public", "private", "loopback"].includes(source.networkScope);
    if (!validSource) rejectRequest("Widget manifest has an invalid source declaration");
  }
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderWorkshopSocialHtml = (html, metadata) => {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const url = escapeHtml(metadata.url);
  const image = escapeHtml(metadata.image);
  const imageAlt = escapeHtml(`${metadata.submissionTitle} preview`);
  const section = escapeHtml(metadata.section);
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Homarr Workshop">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="article:section" content="${section}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:alt" content="${imageAlt}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${imageAlt}">`,
  ].join("\n");
  const replaceableTags =
    /<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*(?:name|property)=["'](?:robots|description|og:(?:title|description|url|image|image:alt|type|site_name)|twitter:(?:card|title|description|image|image:alt)|article:section)["'][^>]*>|<link\b[^>]*rel=["']canonical["'][^>]*>/gi;

  return html.replace(replaceableTags, "").replace("<head>", `<head>\n${tags}`);
};

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
  renderWorkshopSocialHtml,
  sendEmail,
  validateSubmissionManifest,
};
