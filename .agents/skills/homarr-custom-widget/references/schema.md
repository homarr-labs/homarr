# Custom Widget v2 schema

Every import and export is one object with `$schema: "homarr-custom-widget-v2"`, metadata, `sources`, `requests`, `optionsSchema`, `defaultOptions`, optional state, and `template`. Secrets are accepted separately by create/update/preview operations and never exported.

```ts
interface HomarrCustomWidgetV2 {
  $schema: "homarr-custom-widget-v2";
  name: string;
  description?: string;
  iconUrl?: string;
  sources: CustomWidgetSource[];
  requests: CustomWidgetRequest[];
  optionsSchema: CustomWidgetOptionsSchema;
  defaultOptions: Record<string, unknown>;
  stateSchema?: Record<string, "string" | "number" | "boolean" | "date" | "string[]" | "number[]" | "date[]">;
  defaultState?: Record<string, unknown>;
  template: string;
}
```

A source has a stable lowercase `id`, display `name`, `baseUrl`, `networkScope` (`public`, `private`, or `loopback`), and one auth mode: `none`, `bearer`, `basic`, `apiKeyHeader`, or `apiKeyQuery`.

A request has `id`, `sourceId`, `kind`, any supported HTTP `method`, same-origin `pathTemplate`, declared primitive `parameters`, optional `queryTemplate` and `bodyTemplate`, optional safe `staticHeaders`, `auth`, `minimumBoardPermission`, optional `trigger`, caching, confirmation, and invalidation. Parameter names may use camelCase. Bind a declared parameter with `{name}` in a path or `{ "$param": "name" }` in structured query/body data.

Options use a restricted object JSON Schema. Set `additionalProperties: false`. Presentation metadata lives under `x-homarr`; dynamic selects use `optionsSource.requestId`, optional `itemsPath` for wrapped arrays, `valuePath`, and `labelPath`. Default options must validate against the schema.

Option and state names start with a letter and use letters, numbers, `-`, or `_`; camelCase is supported. Every JSX `bind` value is a literal name declared by `stateSchema`.

Do not model credentials as options or static defaults. Credential-like option names and values are rejected; source authentication is configured separately.

When connected, retrieve `homarr://custom-widgets/schema` for the exact machine-readable schema.
