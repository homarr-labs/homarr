const { validatePocketBaseWidget } = require(`${__hooks}/widget-validator.bundle.cjs`);

const validateWidgetManifest = (content) => {
  const result = validatePocketBaseWidget(content);
  if (!result.success) {
    throw new BadRequestError(result.error);
  }
  return result.content;
};

module.exports = { validateWidgetManifest };
