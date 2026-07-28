/// <reference path="../pb_data/types.d.ts" />

const legacyUserUpdateRule = "id = @request.auth.id && @request.body.isAdmin:isset = false";
const legacySubmissionUpdateRule =
  "(author = @request.auth.id || @request.auth.isAdmin = true) && @request.body.author:changed = false && @request.body.type:changed = false && @request.body.widgetSchema:changed = false";
const legacyReportUpdateRule =
  "@request.auth.isAdmin = true && @request.body.reporter:changed = false && @request.body.submission:changed = false";

const identityFieldsUnchanged = [
  "@request.body.email:changed = false",
  "@request.body.displayName:changed = false",
  "@request.body.avatarUrl:changed = false",
  "@request.body.githubUsername:changed = false",
  "@request.body.githubProfileUrl:changed = false",
].join(" && ");

const immutableSubmissionFields = [
  "@request.body.author:changed = false",
  "@request.body.type:changed = false",
  "@request.body.widgetSchema:changed = false",
].join(" && ");

const moderatorSubmissionFieldsUnchanged = [
  "@request.body.title:changed = false",
  "@request.body.description:changed = false",
  "@request.body.content:changed = false",
  "@request.body.changelog:changed = false",
  "@request.body.screenshots:changed = false",
].join(" && ");

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.updateRule = `id = @request.auth.id && @request.body.isAdmin:isset = false && ${identityFieldsUnchanged}`;
    app.save(users);

    const submissions = app.findCollectionByNameOrId("submissions");
    submissions.updateRule =
      `(author = @request.auth.id && ${immutableSubmissionFields}) || ` +
      `(@request.auth.isAdmin = true && author != @request.auth.id && ${immutableSubmissionFields} && ${moderatorSubmissionFieldsUnchanged})`;
    app.save(submissions);

    const reports = app.findCollectionByNameOrId("reports");
    reports.updateRule =
      "@request.auth.isAdmin = true && " +
      "@request.body.reporter:changed = false && " +
      "@request.body.submission:changed = false && " +
      "@request.body.category:changed = false && " +
      "@request.body.explanation:changed = false";
    app.save(reports);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.updateRule = legacyUserUpdateRule;
    app.save(users);

    const submissions = app.findCollectionByNameOrId("submissions");
    submissions.updateRule = legacySubmissionUpdateRule;
    app.save(submissions);

    const reports = app.findCollectionByNameOrId("reports");
    reports.updateRule = legacyReportUpdateRule;
    app.save(reports);
  },
);
