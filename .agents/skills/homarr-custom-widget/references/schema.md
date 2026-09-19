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

Key `default` is the required source ID, not a source property. Fields: `name?`, `baseUrl`, `networkScope`, `auth?`; localhost/loopback URLs require `networkScope: "loopback"`; never widen explicit scope:

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

Saved sources use `{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}`. Discover HTTP kinds with `integration_getKinds`, choose a full-access `integration_all` entry, and bind its ID before preview. Omit URL/auth; paths append to the saved URL, non-GET requests are actions, and exports omit `integrationId`.

Auth is `none`, `bearer`, `basic`, `{ "type": "apiKeyHeader", "name": "X-Api-Key" }`, or `{ "type": "apiKeyQuery", "name": "api_key" }`. Requests default to source `default`, query/GET/load, inherited auth, and view permission. Use `trigger: "load"` for initial/current display, including option-bound data/status with `RefreshButton`; use `trigger: "manual"` only for explicit user-triggered queries or invocation params in `SubFetch`, `ActionButton`, or `ToggleSwitch`. Actions are manual/modify; preserve confirmation, permission, and invalidates. DELETE requires full permission and confirmation. No `load: false`.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Binding syntax is location-specific: path strings use `{option:name}` or `{param:name}` with no `$` (for example, `/items/{option:itemId}`); query/body objects use `{"$option":"name"}` or `{"$param":"name"}`. `$param` is manual-only; `$option` may drive loads. Constants stay primitive (`take: 10`); names and types are inferred.

Every option has `label`, `control`, and `default`. Optional fields are `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, and `group`.
