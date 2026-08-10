const rejectRequest = (message) => {
  throw new BadRequestError(message);
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
    /<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*(?:name|property)=["'](?:description|og:(?:title|description|url|image|image:alt|type|site_name)|twitter:(?:card|title|description|image|image:alt)|article:section)["'][^>]*>|<link\b[^>]*rel=["']canonical["'][^>]*>/gi;

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
};
