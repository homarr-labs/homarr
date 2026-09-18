# Schema

```ts
interface HomarrCustomWidgetV2 {
  $schema: "homarr-custom-widget-v2";
  name: string;
  description?: string;
  iconUrl?: string;
  sources: Record<string, CustomWidgetSource>;
  requests: Record<string, CustomWidgetRequest>;
  options?: Record<string, CustomWidgetOption>;
  template: string;
}
```

`sources.default` is required. HTTP source properties: `name?`, `baseUrl`, `networkScope`, and `auth?`:

```json
{
  "sources": {
    "default": {
      "name": "Service",
      "baseUrl": "http://service.local:5055/api/v1",
      "networkScope": "private",
      "auth": { "type": "apiKeyHeader", "name": "X-Api-Key" }
    }
  },
  "requests": {
    "summary": { "path": "/summary" },
    "search": { "trigger": "manual", "path": "/search", "query": { "q": { "$param": "query" } } },
    "create": {
      "kind": "action",
      "method": "POST",
      "path": "/items",
      "body": { "id": { "$param": "id" } },
      "confirmation": "Create this item?",
      "invalidates": ["search"]
    }
  }
}
```

`{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}` reuses saved credentials. Select a kind with `integration_getKinds` (`supportsHttpRequests: true`) and a matching `integration_all` entry with `permissions.hasFullAccess`; bind its `id` before preview. Omit URL/auth fields. Exports omit `integrationId`. Paths append to the saved URL; non-GET requests must be actions.

Auth is `none`, `bearer`, `basic`, `{ "type": "apiKeyHeader", "name": "X-Api-Key" }`, or `{ "type": "apiKeyQuery", "name": "api_key" }`. Requests default to source `default`, query/GET/load, inherited auth, and view permission. Use `trigger: "load"` for initial/current display, including option-bound data/status with `RefreshButton`; use `trigger: "manual"` only for explicit user-triggered queries or invocation params in `SubFetch`, `ActionButton`, or `ToggleSwitch`. Actions are manual/modify; preserve confirmation, permission, and invalidates. DELETE requires full permission and confirmation. No `load: false`.

HTTP sources declare public URLs or self-hosted suggestions; installers configure their URL, network scope, and credentials separately.

Paths bind `{option:name}` and `{param:name}`; query/body references bind `{ "$option": "name" }` and `{ "$param": "name" }`. Use primitive constants (`take: 10`). `$param` is only for manual requests.

Options require `label`, `control`, and `default`. Optional fields: `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, `group`.
