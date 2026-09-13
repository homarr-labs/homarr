/** Keep public schema metadata honest. Full runtime validation also runs in
 * Homarr's shared validator before publication, preview, and installation. */
const validateSubmissionSchema = (record) => {
  if (record.getString("type") === "customCss") {
    if (record.getString("widgetSchema") !== "homarr-custom-css-v1") {
      throw new BadRequestError("CSS submission schema does not match its type");
    }
    return;
  }
  let widget;
  try {
    widget = JSON.parse(record.getString("content"));
  } catch {
    throw new BadRequestError("Widget content must be JSON");
  }
  if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
    throw new BadRequestError("Widget content must be an object");
  }
  if (widget.$schema !== "homarr-custom-widget-v2" && widget.$schema !== "homarr-custom-widget-v3") {
    throw new BadRequestError("Unsupported widget schema");
  }
  if (widget.$schema !== record.getString("widgetSchema")) {
    throw new BadRequestError("Widget schema metadata must match its content");
  }
  if (widget.$schema === "homarr-custom-widget-v2" && widget.extensions !== undefined) {
    throw new BadRequestError("Widget extensions require homarr-custom-widget-v3");
  }
  const allowedFields = [
    "$schema",
    "name",
    "description",
    "iconUrl",
    "sources",
    "requests",
    "options",
    "template",
    "extensions",
  ];
  if (Object.keys(widget).some((key) => !allowedFields.includes(key))) {
    throw new BadRequestError("Widget content contains unsupported fields");
  }
};

module.exports = { validateSubmissionSchema };
