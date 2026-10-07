import { loader } from "fumadocs-core/source";
import type { MetaData, StaticSource } from "fumadocs-core/source";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { Document } from "fumadocs-openapi";
import type { OpenAPIPageData } from "fumadocs-openapi/server";
import type { Item, Node } from "fumadocs-core/page-tree";

import schema from "../../public/api/open-api-schema.json";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as RecordValue;
}

function hasExactKeys(value: RecordValue, keys: string[]) {
  const actual = Object.keys(value).toSorted();
  const expected = keys.toSorted();
  if (actual.length !== expected.length) return false;
  return actual.every((key, index) => key === expected[index]);
}

function isUnconstrainedRecursiveJsonSchema(name: string, value: unknown) {
  const root = asRecord(value);
  if (!root || !hasExactKeys(root, ["anyOf"]) || !Array.isArray(root.anyOf)) return false;
  if (root.anyOf.length !== 6) return false;

  const simpleTypes = new Set<string>();
  let hasArray = false;
  let hasObject = false;
  const self = `#/components/schemas/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;

  for (const member of root.anyOf) {
    const variant = asRecord(member);
    if (!variant) return false;
    if (typeof variant.type === "string" && hasExactKeys(variant, ["type"])) {
      simpleTypes.add(variant.type);
      continue;
    }
    if (variant.type === "array" && hasExactKeys(variant, ["type", "items"])) {
      const items = asRecord(variant.items);
      if (!items || !hasExactKeys(items, ["$ref"]) || items.$ref !== self) return false;
      hasArray = true;
      continue;
    }
    if (variant.type === "object" && hasExactKeys(variant, ["type", "propertyNames", "additionalProperties"])) {
      const propertyNames = asRecord(variant.propertyNames);
      const additionalProperties = asRecord(variant.additionalProperties);
      if (!propertyNames || !hasExactKeys(propertyNames, ["type"]) || propertyNames.type !== "string") return false;
      if (!additionalProperties || !hasExactKeys(additionalProperties, ["$ref"]) || additionalProperties.$ref !== self)
        return false;
      hasObject = true;
      continue;
    }
    return false;
  }

  return (
    simpleTypes.size === 4 &&
    simpleTypes.has("string") &&
    simpleTypes.has("number") &&
    simpleTypes.has("boolean") &&
    simpleTypes.has("null") &&
    hasArray &&
    hasObject
  );
}

/** Replace only the generator's exact unconstrained recursive JSON schema with its equivalent finite union for Scalar. */
export function normalizeRecursiveJsonSchemas(document: Document): Document {
  const components = asRecord(document.components);
  const schemas = asRecord(components?.schemas);
  if (!components || !schemas) return document;

  const normalizedSchemas = { ...schemas };
  let changed = false;
  for (const [name, value] of Object.entries(schemas)) {
    if (!isUnconstrainedRecursiveJsonSchema(name, value)) continue;
    normalizedSchemas[name] = {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array" },
        { type: "object" },
      ],
    };
    changed = true;
  }
  if (!changed) return document;
  return {
    ...document,
    components: {
      ...components,
      schemas: normalizedSchemas,
    },
  } as unknown as Document;
}

export const openapi = createOpenAPI({
  input: {
    homarr: () => ({
      ...normalizeRecursiveJsonSchemas(schema as unknown as Document),
      servers: [
        {
          url: "{instanceUrl}",
          description: "Enter the full URL of your Homarr instance, including its scheme and reverse-proxy path.",
          variables: {
            instanceUrl: {
              default: "https://homarr.example.com",
              description: "The full URL where your Homarr instance is reachable, including any reverse-proxy path.",
            },
          },
        },
      ],
    }),
  },
});

export const apiTasks = schema["x-homarr-tasks"];

function operationMetadata(data: OpenAPIPageData) {
  const operation = data.getOpenAPIPageProps().operations?.[0];
  if (!operation) throw new Error("Generated reference page must describe an operation");
  const item = asRecord(asRecord(schema.paths)?.[operation.path]);
  const metadata = asRecord(item?.[operation.method]);
  if (!metadata || typeof metadata["x-homarr-task"] !== "string")
    throw new Error(`Missing task metadata for ${operation.method} ${operation.path}`);
  return { path: operation.path, method: operation.method.toUpperCase(), taskId: metadata["x-homarr-task"], metadata };
}

const pageTasks = new Map<string, string>();

function collectPages(nodes: Node[]): Item[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") return [node];
    if (node.type === "folder") return collectPages(node.children);
    return [];
  });
}

const generatedSource = await openapi.staticSource({
  per: "operation",
  groupBy: (entry) => {
    if (entry.type !== "operation") throw new Error("Unexpected webhook in the HTTP reference");
    const item = asRecord(asRecord(schema.paths)?.[entry.item.path]);
    const operation = asRecord(item?.[entry.item.method]);
    const tag = operation?.["x-homarr-doc-tag"];
    if (typeof tag !== "string") throw new Error(`Missing stable documentation path for ${entry.item.path}`);
    return tag;
  },
  meta: true,
});

function operationDocument(document: Document, operations: { path: string; method: string }[]): Document {
  const original = document as unknown as RecordValue;
  const sourcePaths = asRecord(original.paths) ?? {};
  const paths: RecordValue = {};
  for (const { path, method } of operations) {
    const item = asRecord(sourcePaths[path]);
    if (!item) throw new Error(`Missing documentation path ${path}`);
    // Retain path-level parameters and metadata alongside the selected operation.
    const metadata = Object.fromEntries(
      Object.entries(item).filter(
        ([key]) => !["get", "post", "patch", "put", "delete", "head", "options", "trace"].includes(key),
      ),
    );
    paths[path] = { ...metadata, ...asRecord(paths[path]), [method]: item[method] };
  }
  const sourceComponents = asRecord(original.components) ?? {};
  const components: Record<string, RecordValue> = {};
  const visited = new Set<string>();
  function includeReferences(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(includeReferences);
      return;
    }
    const entry = asRecord(value);
    if (!entry) return;
    const reference = entry.$ref;
    if (typeof reference === "string" && reference.startsWith("#/components/")) {
      const [group, name] = reference
        .slice("#/components/".length)
        .split("/")
        .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
      if (!group || !name) throw new Error(`Invalid component reference ${reference}`);
      const key = `${group}/${name}`;
      if (!visited.has(key)) {
        visited.add(key);
        const component = asRecord(sourceComponents[group])?.[name];
        if (component === undefined) throw new Error(`Missing component reference ${reference}`);
        components[group] ??= {};
        components[group][name] = component;
        includeReferences(component);
      }
    }
    Object.values(entry).forEach(includeReferences);
  }
  const securitySchemes = asRecord(sourceComponents.securitySchemes);
  if (securitySchemes) components.securitySchemes = securitySchemes;
  includeReferences(paths);
  includeReferences(securitySchemes);
  return { ...document, paths, components } as unknown as Document;
}

if (!Array.isArray(generatedSource.files)) throw new Error("API reference generation requires a static source");
const scopedSource: StaticSource<{ metaData: MetaData; pageData: OpenAPIPageData }> = {
  ...generatedSource,
  files: generatedSource.files.map((file) => {
    if (file.type !== "page") return file;
    const props = file.data.getOpenAPIPageProps();
    const bundled = operationDocument(props.payload.bundled, props.operations ?? []);
    return {
      ...file,
      data: {
        ...file.data,
        getOpenAPIPageProps: () => ({ ...props, payload: { ...props.payload, bundled } }),
        getSchema: () => ({ ...file.data.getSchema(), bundled }),
      },
    };
  }),
};

export const apiSource = loader({
  baseUrl: "/api-reference",
  source: scopedSource,
  pageTree: {
    transformers: [
      {
        file(node, path) {
          const file = path && this.storage.read(path);
          if (file && file.format === "page") pageTasks.set(node.url, operationMetadata(file.data).taskId);
          return node;
        },
        root(node) {
          const pages = collectPages(node.children);
          return {
            ...node,
            children: apiTasks
              .map((task) => ({
                type: "folder" as const,
                $id: `api-task-${task.id}`,
                name: task.title,
                description: task.description,
                defaultOpen: false,
                children: pages
                  .filter((page) => pageTasks.get(page.url) === task.id)
                  .toSorted((left, right) => left.url.localeCompare(right.url)),
              }))
              .filter((folder) => folder.children.length > 0),
          };
        },
      },
    ],
  },
});

export const apiTaskPages = apiTasks
  .map((task) => ({
    ...task,
    pages: apiSource
      .getPages()
      .filter((page) => operationMetadata(page.data).taskId === task.id)
      .map((page) => ({
        page,
        ...operationMetadata(page.data),
      }))
      .toSorted((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method)),
  }))
  .filter((task) => task.pages.length > 0);
