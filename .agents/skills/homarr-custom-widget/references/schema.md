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

Key `default` is the required source ID, not a source property. Fields: `name?`, `baseUrl`, `auth?`:

```json
{
  "$schema": "homarr-custom-widget-v2",
  "name": "Service summary",
  "sources": {
    "default": {
      "name": "Service",
      "baseUrl": "http://service.local:5055/api/v1",
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
  },
  "template": "<Text>{data.summary?.title}</Text>"
}
```

Saved sources use `{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}`; paths append to its URL and exports omit `integrationId`.

Besides the SKILL.md `auth` forms, `{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"}]}` sends up to 8
encrypted headers (unique names, distinct slots of at most 57 characters; renaming either needs reconfiguration). Use
`bearer` for Authorization; routing, proxy, cookie and hop-by-hop headers are reserved. Requests default to source `default`, query/GET/load, inherited auth, and
view permission. Use `load` for initial/current display and `manual` only for explicit interactions or invocation
params. Actions are manual/modify; DELETE requires full permission and confirmation.

JSON responses become their decoded value; `application/x-ndjson` becomes an array of decoded lines. Use real public
API URLs and clear self-hosted placeholders; Homarr collects URL and credentials outside the manifest.

`$option` bindings may drive loads; path and query constants stay primitive.

Every option has `label`, `control`, and `default`. Optional fields are `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, and `group`.
Controls: `text`, `textarea`, `number`, `switch`, `select`, `multiSelect`, `slider`, `date`, `time`, `color`, `icon`, `url`,
`duration`, `timeZone`, `json`. `choices`/`choicesFrom` need `select` or `multiSelect`.
