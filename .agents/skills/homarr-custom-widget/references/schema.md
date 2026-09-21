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

Saved sources use `{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}`. Discover and bind a full-access entry before preview. Omit URL/auth; paths append to its URL, non-GET requests are actions, and exports omit `integrationId`.

Auth is `none`, `bearer`, `basic`, `apiKeyHeader`, or `apiKeyQuery`. Requests default to source `default`, query/GET/load, inherited auth, and view permission. Use `load` for initial/current display and `manual` only for explicit interactions or invocation params. Actions are manual/modify; DELETE requires full permission and confirmation.

JSON responses become their decoded value. Responses with `application/x-ndjson` become an array with one decoded object per non-empty line.

Use real public API URLs and clear self-hosted placeholders. Homarr collects URL, scope, and credentials outside the manifest.

Paths use `{option:name}`/`{param:name}`; query/body objects use `{"$option":"name"}`/`{"$param":"name"}`. `$param` is manual-only; `$option` may drive loads. Constants stay primitive.

Every option has `label`, `control`, and `default`. Optional fields are `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, and `group`.
