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

Integration sources use `{"type":"integration","integrationKind":"sonarr"}` (Sonarr or Radarr). Bind a local `integrationId` from `integration_all`; exports omit it. Omit URL/auth fields. Paths append to the integration URL; non-GET requests must be actions.

Auth: `none`, `bearer`, `basic`, `{ "type": "apiKeyHeader", "name": "X-Api-Key" }`, or `{ "type": "apiKeyQuery", "name": "api_key" }`. Requests default to source `default`, kind `query`, method `GET`, trigger `load`, inherited auth, and view permission. Parameterized queries need `trigger: "manual"`. Actions default to manual/modify; DELETE requires full permission and confirmation. Do not use `load: false`.

HTTP sources declare public URLs or self-hosted suggestions; installers configure their URL, network scope, and credentials separately.

Paths bind `{option:name}` and `{param:name}`; query/body references bind `{ "$option": "name" }` and `{ "$param": "name" }`. Use primitive constants (`take: 10`). `$param` is only for manual requests.

Options require `label`, `control`, and `default`. Optional fields: `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, `group`.
