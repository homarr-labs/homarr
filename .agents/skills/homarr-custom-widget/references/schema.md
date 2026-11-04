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

`sources.default` is required. HTTP sources have `baseUrl`, optional `name`, and optional `auth` (default `"none"`). Base URLs
have no credentials, query, or fragment. Use documented public URLs or `https://your-service.example.com` for missing
self-hosted URLs; Homarr configures URLs and credentials separately.

```json
{
  "sources": {
    "default": {
      "baseUrl": "https://your-service.example.com/api/v1",
      "auth": { "type": "apiKeyHeader", "name": "X-Api-Key" }
    }
  },
  "requests": {
    "summary": { "path": "/summary" },
    "search": {
      "trigger": "manual",
      "path": "/search",
      "query": { "q": { "$param": "query" }, "page": { "$param": "page" } }
    },
    "create": {
      "kind": "action",
      "method": "POST",
      "path": "/items",
      "body": { "id": { "$param": "id" } },
      "confirmation": "Create this item?",
      "invalidates": ["summary"]
    }
  }
}
```

Auth: `"none"`, `"bearer"`, `"basic"`, `{"type":"apiKeyHeader","name":"X-Api-Key"}`, or
`{"type":"apiKeyQuery","name":"api_key"}`. Values are credential-free declarations.

Multiple encrypted headers use `{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"},{"name":"X-Api-Secret","slot":"secret"}]}`.
Use at most 8 HTTP-token names, unique ignoring case, with distinct stable slot IDs of at most 57 characters. Configure
values separately in Homarr. Header name or slot changes require credential configuration again. Use `bearer` for
Authorization; routing, proxy, forwarding, cookie and hop-by-hop headers remain reserved.

Saved sources use `{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}`. Discover supported kinds
and matching full-access entries with integration tools. Bind the ID before preview; omit URL/auth. Paths append to the
saved URL; non-GET requests are actions. Portable exports omit integrationId.

Requests default to source `default`, query/GET/load, inherited auth, and view permission. Initial/current displays use load;
explicit interactions use manual. Actions stay manual with modify permission; DELETE requires full permission and
confirmation. Preserve confirmation, permission, and invalidates. Query responses are decoded JSON; application/x-ndjson is
an array of decoded lines.

Paths start with `/` and use `{option:name}`/`{param:name}`. Query/body bindings use `{"$option":"name"}`/`{"$param":"name"}`.
`$param` is manual-only; `$option` may drive loads. Path/query values are primitive; JSON bodies may contain structured options.

Every option has label, control, default. Optional fields: description, choices, choicesFrom, min, max, step, advanced, group.
Static select choices are label/value objects; choicesFrom uses request, optional itemsPath, valuePath, and labelPath. Use a
load request and preserve its response envelope. Structured options use control `json`.
