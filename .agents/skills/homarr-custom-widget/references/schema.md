# Custom Widget v2 schema

Every import and export is one object with `$schema: "homarr-custom-widget-v2"`, metadata, `sources`, `requests`, `optionsSchema`, `defaultOptions`, and `template`. Secrets are accepted separately by create/update/preview operations and never exported.

The safe-local-binding and `RecursiveList` expansion changes only template authoring. It does not add database fields, request fields, persistence, or another widget schema version.

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
  template: string;
}
```

A source has a stable lowercase `id`, display `name`, `baseUrl`, `networkScope` (`public`, `private`, or `loopback`), and one auth mode: `none`, `bearer`, `basic`, `apiKeyHeader`, or `apiKeyQuery`.

A request has `id`, `sourceId`, `kind`, any supported HTTP `method`, same-origin `pathTemplate`, declared primitive `parameters`, optional `optionsBinding`, `queryTemplate`, and `bodyTemplate`, optional safe `staticHeaders`, `auth`, `minimumBoardPermission`, optional `trigger`, caching, confirmation, and invalidation. Parameter names may use camelCase. Reference a declared parameter with `{name}` in a path or `{ "$param": "name" }` in structured query/body data.

Every declared parameter needs an explicit source. For a load query, bind each parameter in `optionsBinding` with `{ "$option": "optionName" }` or a primitive literal of the declared type. The referenced option must exist in `optionsSchema`. For manual queries and actions, the invoking `SubFetch`, `ActionButton`, or `ToggleSwitch` supplies the complete parameter object through `params`. Never infer a source because a parameter, option, or temporary input has the same name.

Dynamic option requests have no JSX invoker and therefore also require `optionsBinding` for every parameter they declare.

Options use a restricted object JSON Schema. Set `additionalProperties: false`. Presentation metadata lives under `x-homarr`; dynamic selects use `optionsSource.requestId`, optional `itemsPath` for wrapped arrays, `valuePath`, and `labelPath`. Default options must validate against the schema.

Option and bind names start with a letter and use letters, numbers, `-`, or `_`; camelCase is supported. Every JSX `bind` value is a literal temporary input name.

Do not model credentials as options or static defaults. Credential-like option names and values are rejected; source authentication is configured separately.

Do not add `stateSchema`, `defaultState`, scripts, imports, or component declarations to the manifest. Temporary interaction values come only from JSX `bind` controls and are exposed through `inputs`. Derived values declared with safe `const` blocks exist only while evaluating the template.

This reference is sufficient for offline authoring against the matching release. When connected, retrieve the live Custom Widget schema; it supersedes this static copy if the installed Homarr version differs.
