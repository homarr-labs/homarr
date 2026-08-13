import type { PlopTypes } from "@turbo/gen";

import type { FeatureRequest } from "../../scripts/feature-platform/generate-feature.mts";
import { generateFeature, getIntegrationGeneratorChoices } from "../../scripts/feature-platform/generate-feature.mts";

type Answers = Record<string, unknown> & { turbo: { paths: { root: string } } };

const text = (value: unknown) => String(value ?? "").trim();
const list = (value: unknown) =>
  (Array.isArray(value) ? value : text(value).split(",")).map((item) => text(item)).filter(Boolean);
const lowerCamel = (value: string) =>
  /^[a-z][A-Za-z0-9]*$/.test(value) || "Use lower camel case (for example, mediaServer).";
const kebab = (value: string) =>
  /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/.test(value) ||
  "Start with a lowercase letter and use kebab-case (for example, media-server).";
const required = (value: string) => value.trim().length > 0 || "This value is required.";
const integrationPrompts = (root: string, prefix = "") => {
  const choices = getIntegrationGeneratorChoices(root);
  return [
    { type: "input", name: `${prefix}Kind`, message: "Integration kind", validate: lowerCamel },
    { type: "input", name: `${prefix}Name`, message: "Integration display name", validate: required },
    { type: "input", name: `${prefix}Slug`, message: "Integration docs and folder slug", validate: kebab },
    {
      type: "input",
      name: `${prefix}Description`,
      message: "One-sentence integration description",
      validate: required,
    },
    {
      type: "list",
      name: `${prefix}Category`,
      message: "Existing integration category",
      choices: choices.categories,
      default: "miscellaneous",
    },
    {
      type: "checkbox",
      name: `${prefix}SecretKinds`,
      message: "Credential kinds (leave empty for an unauthenticated integration)",
      choices: choices.secretKinds,
    },
    {
      type: "input",
      name: `${prefix}IconUrl`,
      message: "Integration icon URL",
      default: (answers: Answers) =>
        `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${text(answers[`${prefix}Slug`])}.svg`,
      validate: required,
    },
  ] satisfies PlopTypes.PromptQuestion[];
};

const widgetPrompts = (prefix = "") =>
  [
    { type: "input", name: `${prefix}Kind`, message: "Widget kind", validate: lowerCamel },
    { type: "input", name: `${prefix}Name`, message: "Widget display name", validate: required },
    { type: "input", name: `${prefix}Slug`, message: "Widget docs and folder slug", validate: kebab },
    { type: "input", name: `${prefix}Description`, message: "One-sentence widget description", validate: required },
    { type: "input", name: `${prefix}Icon`, message: "Tabler icon export", default: "IconBox", validate: required },
    {
      type: "input",
      name: `${prefix}SupportedIntegrations`,
      message: "Supported integration kinds, comma-separated (blank for standalone)",
      default: "",
    },
  ] satisfies PlopTypes.PromptQuestion[];

const integrationFrom = (answers: Answers, prefix = "") => ({
  kind: text(answers[`${prefix}Kind`]),
  name: text(answers[`${prefix}Name`]),
  slug: text(answers[`${prefix}Slug`]),
  description: text(answers[`${prefix}Description`]),
  category: text(answers[`${prefix}Category`]),
  secretKinds: list(answers[`${prefix}SecretKinds`]),
  iconUrl: text(answers[`${prefix}IconUrl`]),
});

const widgetFrom = (answers: Answers, prefix = "") => ({
  kind: text(answers[`${prefix}Kind`]),
  name: text(answers[`${prefix}Name`]),
  slug: text(answers[`${prefix}Slug`]),
  description: text(answers[`${prefix}Description`]),
  icon: text(answers[`${prefix}Icon`]),
  supportedIntegrations: list(answers[`${prefix}SupportedIntegrations`]),
});

const action =
  (request: (answers: Answers) => FeatureRequest): PlopTypes.CustomActionFunction =>
  async (rawAnswers) => {
    const answers = rawAnswers as Answers;
    const changes = await generateFeature(answers.turbo.paths.root, request(answers));
    return `Created or updated ${changes.length} feature files. Run pnpm check:feature-contracts next.`;
  };

export default function generator(plop: PlopTypes.NodePlopAPI) {
  const root = plop.getDestBasePath();
  plop.setGenerator("native-integration", {
    description: "Scaffold a native integration, tests, docs, translations, and current explicit registries",
    prompts: integrationPrompts(root),
    actions: [action((answers) => ({ integration: integrationFrom(answers) }))],
  });
  plop.setGenerator("widget", {
    description: "Scaffold a widget, tests, docs, translations, and current explicit registries",
    prompts: widgetPrompts(),
    actions: [action((answers) => ({ widget: widgetFrom(answers) }))],
  });
  plop.setGenerator("integration-widget", {
    description: "Scaffold a paired native integration and widget contract",
    prompts: [...integrationPrompts(root, "integration"), ...widgetPrompts("widget")],
    actions: [
      action((answers) => {
        const integration = integrationFrom(answers, "integration");
        const widget = widgetFrom(answers, "widget");
        if (widget.supportedIntegrations.length === 0) widget.supportedIntegrations = [integration.kind];
        return { integration, widget };
      }),
    ],
  });
}
