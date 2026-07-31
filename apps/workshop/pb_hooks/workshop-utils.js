const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const rejectRequest = (message) => {
  throw new BadRequestError(message);
};

const normalizedIdentityText = (...values) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = [...value]
      .filter((character) => {
        const code = character.codePointAt(0) || 0;
        return code > 31 && code !== 127;
      })
      .join("")
      .trim();
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
};
