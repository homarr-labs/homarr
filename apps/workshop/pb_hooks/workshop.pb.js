/// <reference path="../pb_data/types.d.ts" />

onBootstrap((event) => {
  const clientId = String($os.getenv("GITHUB_CLIENT_ID") || "").trim();
  const clientSecret = String($os.getenv("GITHUB_CLIENT_SECRET") || "").trim();
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    console.log(JSON.stringify({ event: "workshop_oauth_configuration_rejected", reason: "partial_credentials" }));
    throw new Error("GitHub OAuth requires both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");
  }
  const configured = Boolean(clientId && clientSecret);
  event.next();
  const users = event.app.findCollectionByNameOrId("users");
  users.oauth2.enabled = configured;
  users.oauth2.mappedFields = { id: "", name: "", username: "name", avatarURL: "" };
  users.oauth2.providers = configured ? [{ name: "github", clientId, clientSecret }] : [];
  event.app.save(users);
  console.log(JSON.stringify({ event: "workshop_oauth_synchronized", enabled: configured }));
});

const workshopDetailPage = (event) => {
  const id = event.request.pathValue("id");
  if (id === "admin") return event.fileFS($os.dirFS("/pb_public"), "workshop/admin/index.html");

  const indexHtml = toString($os.readFile("/pb_public/index.html"));
  try {
    const { renderWorkshopSocialHtml } = require(`${__hooks}/workshop-utils.js`);
    const submission = event.app.findRecordById("submissions", id);
    const type = submission.getString("type");
    const section = type === "customCss" ? "Custom CSS" : "Custom widget";
    const submissionTitle = submission.getString("title");
    const title = `${submissionTitle} · Homarr Workshop`;
    const description = `${section} for Homarr. ${submission.getString("description")}`.trim();
    const workshopUrl = $os.getenv("WORKSHOP_WEB_URL").replace(/\/$/, "");
    const apiUrl = $os.getenv("WORKSHOP_API_URL").replace(/\/$/, "");
    const websiteUrl = $os.getenv("HOMARR_WEBSITE_URL").replace(/\/$/, "");
    const screenshot = submission.getStringSlice("screenshots")[0];
    const image = screenshot
      ? `${apiUrl}/api/files/submissions/${submission.id}/${encodeURIComponent(screenshot)}`
      : `${websiteUrl}/img/logo.png`;

    return event.html(
      200,
      renderWorkshopSocialHtml(indexHtml, {
        title,
        description,
        url: `${workshopUrl}/${submission.id}`,
        image,
        section,
        submissionTitle,
      }),
    );
  } catch {
    return event.html(200, indexHtml);
  }
};

routerAdd("GET", "/workshop/{id}", workshopDetailPage);
routerAdd("GET", "/workshop/{id}/{$}", workshopDetailPage);

onRecordCreateRequest((event) => {
  event.record.set("revision", 1);
  event.record.set("expectedRevision", 0);
  event.record.set("changelog", "");
  event.record.set("outdated", false);
  event.next();
}, "submissions");

onRecordUpdateRequest((event) => {
  const { rejectRequest } = require(`${__hooks}/workshop-utils.js`);
  const original = event.record.original();
  const currentRevision = original.getInt("revision");
  const expectedRevision = event.record.getInt("expectedRevision");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    rejectRequest("Submission changed since it was read");
  }
  event.record.set("expectedRevision", expectedRevision);
  event.record.set("revision", currentRevision + 1);
  event.next();
}, "submissions");

onRecordCreateRequest((event) => {
  const auth = event.requestInfo().auth;
  const reporter = event.record.getString("reporter");
  const submission = event.record.getString("submission");
  if (auth && auth.id === reporter) {
    const dismissed = event.app.findRecordsByFilter(
      "reports",
      "reporter = {:reporter} && submission = {:submission} && status = 'dismissed'",
      "",
      1,
      0,
      { reporter, submission },
    );
    if (dismissed.length > 0) {
      event.app.delete(dismissed[0]);
      console.log(
        JSON.stringify({
          event: "workshop_report_reopened",
          reporterId: reporter,
          submissionId: submission,
        }),
      );
    }
  }
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
    const publicWorkshopUrl = ($os.getenv("WORKSHOP_WEB_URL") || `${publicOrigin}/workshop`).replace(/\/$/, "");

    if (!recipientEmail || recipient.id === commenter.id || !publicOrigin) {
      event.next();
      return;
    }

    const commenterName = commenter.getString("name") || "A community member";
    const submissionTitle = submission.getString("title");
    const rawExcerpt = event.record.getString("content").slice(0, 280);
    const submissionUrl = `${publicWorkshopUrl}/${submission.id}/`;
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
    const publicWorkshopUrl = ($os.getenv("WORKSHOP_WEB_URL") || `${publicOrigin}/workshop`).replace(/\/$/, "");
    const admins = event.app.findRecordsByFilter("users", "isAdmin = true && email != ''", "", 100, 0);

    if (!publicOrigin || admins.length === 0) {
      event.next();
      return;
    }

    const reporterName = reporter.getString("name") || "A community member";
    const submissionTitle = submission.getString("title");
    const category = event.record.getString("category");
    const explanation = event.record.getString("explanation");
    const adminUrl = `${publicWorkshopUrl}/admin`;
    const submissionUrl = `${publicWorkshopUrl}/${submission.id}/`;
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
    const workshopUrl = ($os.getenv("WORKSHOP_WEB_URL") || (publicOrigin ? `${publicOrigin}/workshop` : "")).replace(
      /\/?$/,
      "/",
    );
    const template = emailTemplate("submission-deleted-email.html").replaceAll(
      "{{submissionTitle}}",
      escapeHtml(submissionTitle),
    );
    const text = `A Workshop moderator removed your submission “${submissionTitle}”.${
      workshopUrl ? `\n\nReturn to Workshop: ${workshopUrl}` : ""
    }`;

    sendEmail(event.app, recipientEmail, `Your Workshop submission was removed`, text, template);
  } catch (error) {
    console.log(`Workshop deletion email failed for ${submissionId}: ${error}`);
  }
}, "submissions");
