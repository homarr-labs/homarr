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

The object key `default` is the required source ID; `default` is not a property on a source. Source properties are `name?`, `baseUrl`, `networkScope`, and `auth?`:

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

Auth is `none`, `bearer`, `basic`, `{ "type": "apiKeyHeader", "name": "X-Api-Key" }`, or `{ "type": "apiKeyQuery", "name": "api_key" }`. A request defaults to source `default`, kind `query`, method `GET`, trigger `load`, inherited auth, and view permission. Set `trigger: "manual"` for a parameterized query. An action defaults to manual and modify permission. DELETE uses full permission and confirmation. Do not use `load: false`.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Paths use `{option:name}` and `{param:name}`; query/body references use `{ "$option": "name" }` and `{ "$param": "name" }`. Constants stay primitive (`take: 10`); `$param` is only for manual helpers, never load queries. Names and types are inferred.

Every option has `label`, `control`, and `default`. Optional fields are `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, and `group`.
