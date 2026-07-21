/// <reference path="../pb_data/types.d.ts" />

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
    const sender = event.app.settings().meta;
    const message = new MailerMessage({
      from: { address: sender.senderAddress, name: sender.senderName },
      to: [{ address: recipientEmail }],
      subject: `${commenterName} commented on ${submissionTitle}`,
      text: `${commenterName} commented on “${submissionTitle}”:\n\n${rawExcerpt}\n\n${submissionUrl}`,
      html: `<p><strong>${escapeHtml(commenterName)}</strong> commented on <strong>${escapeHtml(submissionTitle)}</strong>:</p><blockquote>${escapeHtml(rawExcerpt)}</blockquote><p><a href="${escapeHtml(submissionUrl)}">View the comment</a></p>`,
    });
    event.app.newMailClient().send(message);
  } catch (error) {
    console.log(`Workshop comment email failed for ${event.record.id}: ${error}`);
  }
  event.next();
}, "comments");
