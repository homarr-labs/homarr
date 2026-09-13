/// <reference path="../pb_data/types.d.ts" />

const identityUnchanged = "@request.body.author:changed = false && @request.body.type:changed = false";
const schemaUnchanged = "@request.body.widgetSchema:changed = false";
const supportedWidgetTransition =
  "type = 'customWidget' && " +
  "(widgetSchema = 'homarr-custom-widget-v2' || widgetSchema = 'homarr-custom-widget-v3') && " +
  "(@request.body.widgetSchema = 'homarr-custom-widget-v2' || @request.body.widgetSchema = 'homarr-custom-widget-v3')";
const moderatorUnchanged = ["title", "description", "content", "changelog", "screenshots"]
  .map((field) => `@request.body.${field}:changed = false`)
  .join(" && ");
const submissionRule = (authorSchemaRule) =>
  `(author = @request.auth.id && ${identityUnchanged} && (${authorSchemaRule})) || ` +
  `(@request.auth.isAdmin = true && author != @request.auth.id && ${identityUnchanged} && ${schemaUnchanged} && ${moderatorUnchanged})`;

migrate(
  (app) => {
    const submissions = app.findCollectionByNameOrId("submissions");
    submissions.updateRule = submissionRule(`${schemaUnchanged} || (${supportedWidgetTransition})`);
    app.save(submissions);
  },
  (app) => {
    const submissions = app.findCollectionByNameOrId("submissions");
    submissions.updateRule = submissionRule(schemaUnchanged);
    app.save(submissions);
  },
);
