/// <reference path="../pb_data/types.d.ts" />

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
  const { validateAndNormalizeSubmission } = require(`${__hooks}/workshop-utils.js`);
  validateAndNormalizeSubmission(event.record);
  event.record.set("revision", 1);
  event.record.set("changelog", "");
  event.record.set("outdated", false);
  event.next();
}, "submissions");

onRecordUpdateRequest((event) => {
  const { requestBodyValue, validateAndNormalizeSubmission } = require(`${__hooks}/workshop-utils.js`);
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

onRecordAfterCreateSuccess((event) => {
  try {
    const { emailTemplate, escapeHtml, sendEmail } = require(`${__hooks}/workshop-utils.js`);
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
    const { emailTemplate, escapeHtml, sendEmail } = require(`${__hooks}/workshop-utils.js`);
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
  const { emailTemplate, escapeHtml, sendEmail } = require(`${__hooks}/workshop-utils.js`);
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
