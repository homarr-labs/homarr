import type { apiSource } from "@/lib/openapi";

type ApiPage = ReturnType<typeof apiSource.getPages>[number];
type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
}

function resolveReferences(value: unknown, document: UnknownRecord, seen = new Set<string>()): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveReferences(item, document, seen));
  const current = record(value);
  if (!current) return value;

  const referenceValue = current.$ref;
  if (typeof referenceValue !== "string" || !referenceValue.startsWith("#/")) {
    return Object.fromEntries(
      Object.entries(current).map(([key, item]) => [key, resolveReferences(item, document, seen)]),
    );
  }
  const reference = referenceValue;
  if (seen.has(reference)) return { $ref: reference };

  let target: unknown = document;
  for (const segment of reference.slice(2).split("/")) {
    const parent = record(target);
    target = parent?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  if (target === undefined) return current;

  const nextSeen = new Set(seen).add(reference);
  const resolved = record(resolveReferences(target, document, nextSeen));
  if (!resolved) return target;
  const siblings = Object.fromEntries(
    Object.entries(current)
      .filter(([key]) => key !== "$ref")
      .map(([key, item]) => [key, resolveReferences(item, document, nextSeen)]),
  );
  return { ...resolved, ...siblings };
}

function formatSchema(value: unknown): string {
  if (value === undefined) return "";
  return `\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function renderParameters(parameters: unknown, document: UnknownRecord): string {
  if (!Array.isArray(parameters) || parameters.length === 0) return "";

  const rows = parameters.flatMap((value) => {
    const parameter = record(resolveReferences(value, document));
    if (!parameter) return [];
    const schema = record(parameter.schema);
    let type = "object";
    if (typeof schema?.type === "string") type = schema.type;
    let required = "";
    if (parameter.required === true) required = " (required)";
    let description = "";
    if (typeof parameter.description === "string") description = ` — ${parameter.description}`;
    let location = "parameter";
    if (typeof parameter.in === "string") location = parameter.in;
    let name = "unknown";
    if (typeof parameter.name === "string") name = parameter.name;
    return [
      `- \`${name}\` (${location}, ${type}${required})${description}${formatSchema(resolveReferences(parameter.schema, document))}`,
    ];
  });

  if (rows.length === 0) return "";
  return `\n### Parameters\n\n${rows.join("\n")}`;
}

function renderRequestBody(requestBody: unknown, document: UnknownRecord): string {
  const body = record(resolveReferences(requestBody, document));
  const content = record(body?.content);
  if (!content) return "";

  const parts = Object.entries(content).flatMap(([mediaType, mediaValue]) => {
    const media = record(mediaValue);
    if (!media) return [];
    const schema = resolveReferences(media.schema, document);
    const example = media.example;
    const examples = record(media.examples);
    let exampleText = formatSchema(example);
    if (example === undefined && examples) exampleText = formatSchema(examples);
    return [`#### ${mediaType}${formatSchema(schema)}${exampleText}`];
  });
  if (parts.length === 0) return "";

  let description = "";
  if (typeof body?.description === "string") description = `${body.description}\n\n`;
  let required = "";
  if (body?.required === true) required = " Required.";
  return `\n### Request body\n\n${description}${required}\n${parts.join("\n\n")}`;
}

function renderResponses(responses: unknown, document: UnknownRecord): string {
  const entries = record(resolveReferences(responses, document));
  if (!entries) return "";

  const parts = Object.entries(entries).flatMap(([status, value]) => {
    const response = record(value);
    if (!response) return [];
    let description = "";
    if (typeof response.description === "string") description = response.description;
    const content = record(response.content);
    let schemas: string[] = [];
    if (content) {
      schemas = Object.entries(content).flatMap(([mediaType, mediaValue]) => {
        const media = record(mediaValue);
        if (!media) return [];
        return [
          `\n${mediaType}${formatSchema(resolveReferences(media.schema, document))}${formatSchema(media.example)}`,
        ];
      });
    }
    let heading = `#### ${status}`;
    if (description) heading += ` — ${description}`;
    return [`${heading}${schemas.join("\n")}`];
  });
  if (parts.length === 0) return "";
  return `\n### Responses\n\n${parts.join("\n\n")}`;
}

/** Render one generated OpenAPI page as portable Markdown for search and LLM exports. */
export function getApiMarkdown(page: ApiPage): string {
  const props = page.data.getOpenAPIPageProps();
  const schema = record(page.data.getSchema().bundled);
  const paths = record(schema?.paths);
  const operations = props.operations ?? [];
  let pageDescription = "";
  if (page.data.description) pageDescription = `${page.data.description}\n\n`;
  const rendered = operations.flatMap(({ path, method }) => {
    const pathItem = record(paths?.[path]);
    const operation = record(resolveReferences(pathItem?.[method], schema ?? {}));
    if (!operation) return [];

    let operationId: string | undefined;
    if (typeof operation.operationId === "string") operationId = operation.operationId;
    let title = operationId ?? `${method.toUpperCase()} ${path}`;
    if (typeof operation.summary === "string") title = operation.summary;
    let description = "";
    if (typeof operation.description === "string") description = `${operation.description}\n\n`;
    const parameters = [...arrayValue(pathItem?.parameters), ...arrayValue(operation.parameters)];
    const security = operation.security ?? schema?.security;
    const components = record(schema?.components);
    const schemes = record(components?.securitySchemes);
    let authenticationOptional = false;
    let authLines: string[] = [];
    if (Array.isArray(security)) {
      authLines = security.flatMap((requirement) => {
        const names = record(requirement);
        if (!names) return [];
        if (Object.keys(names).length === 0) authenticationOptional = true;
        return Object.keys(names).flatMap((name) => {
          const scheme = record(resolveReferences(schemes?.[name], schema ?? {}));
          if (!scheme) return [];
          let location = "authorization";
          if (typeof scheme.in === "string") location = scheme.in;
          let keyName = name;
          if (typeof scheme.name === "string") keyName = scheme.name;
          let schemeDescription = "";
          if (typeof scheme.description === "string") schemeDescription = ` — ${scheme.description}`;
          return [`- ${keyName} (${location})${schemeDescription}`];
        });
      });
    }
    let auth = "";
    if (authLines.length > 0) {
      let heading = "### Authentication";
      if (authenticationOptional) heading += " (optional)";
      auth = `\n${heading}\n\n${authLines.join("\n")}\n`;
    }

    let heading = `## ${title}\n\n\`${method.toUpperCase()} ${path}\``;
    if (operationId) heading += `\n\nOperation ID: \`${operationId}\``;

    return [
      `${heading}\n\n${description}${auth}${renderParameters(parameters, schema ?? {})}${renderRequestBody(operation.requestBody, schema ?? {})}${renderResponses(operation.responses, schema ?? {})}`,
    ];
  });

  const serverGuidance =
    "Set Server URL to the full URL of your Homarr instance, including its scheme and reverse-proxy path. Requests run from your browser only after you select Test; authentication values are not persisted.\n\n";
  return `# ${page.data.title}\n\n${pageDescription}${serverGuidance}${rendered.join("\n\n")}`.trim();
}

export function getApiMarkdownUrl(page: ApiPage) {
  const segments = [...page.url.replace(/^\/api-reference\/?/, "").split("/"), "content.md"];
  return {
    segments,
    url: `/llms.mdx${page.url}/content.md`,
  };
}

function arrayValue(value: unknown) {
  if (Array.isArray(value)) return value;
  return [];
}
