# Schema

Import requires `$schema`, `name`, keyed `sources`/`requests`, and one JSX `template` string.
Optional: `description`, valid URL `iconUrl`, keyed `options`. Key `default` is required in sources, not a source property.

```json
{
  "$schema": "homarr-custom-widget-v2",
  "name": "Service summary",
  "sources": { "default": { "baseUrl": "https://your-service.example.com/api", "auth": "bearer" } },
  "requests": { "summary": { "path": "/summary", "trigger": "load" } },
  "template": "<Text>{data.summary?.title}</Text>"
}
```

Saved sources use `{"type":"integration","integrationKind":"sonarr","integrationId":"saved-id"}`; paths append to its URL and exports omit `integrationId`.

HTTP sources have optional `name`, required `baseUrl`, and credential-free `auth` forms:
`"none"`, `"bearer"`, `"basic"`, `{"type":"apiKeyHeader","name":"X-Api-Key"}`,
`{"type":"apiKeyQuery","name":"api_key"}`, or `{"type":"headers","headers":[{"name":"X-Api-Key","slot":"key"}]}`.
`{"type":"none"}` is invalid. Headers auth sends up to 8 encrypted headers: unique names, distinct slots of at most
57 characters; renaming either needs reconfiguration. Use `bearer` for Authorization; routing/proxy/cookie/hop-by-hop headers
are reserved. Configure values only in Homarr's secure credential UI, never chat or definitions.

Requests default to source `default`, query/GET/load, inherited auth and view permission. Use `load` for initial/current
display and `manual` for explicit interactions or invocation params. Actions default to modify permission.
HTTP read-only GET/POST/PUT/PATCH may be queries; semantics, not method, decide. Mutations: manual actions, modify permission, confirmation. Integration queries: GET only; non-GET integration requests are manual actions. DELETE: always action/full, confirmation.

JSON responses become their decoded value; `application/x-ndjson` becomes an array of decoded lines. Use real public
API URLs and clear self-hosted placeholders; Homarr collects URL and credentials outside the manifest.

Paths start with `/`; use `{option:name}`/`{param:name}` in paths and `{"$option":"name"}`/`{"$param":"name"}` in query/body.
`$param` is manual-only; `$option` may drive loads. Path/query values are primitive. Actions use `kind:"action"`,
`trigger:"manual"`, method/body, permission, confirmation, and `invalidates` request IDs; never invent mutation endpoints.

Options: required `label`/`control`/`default`; optional `description`/`choices`/`choicesFrom`/`min`/`max`/`step`/`advanced`/`group`.
Controls: `text`, `textarea`, `number`, `switch`, `select`, `multiSelect`, `slider`, `date`, `time`, `color`, `icon`, `url`,
`duration`, `timeZone`, `json`. `choices`/`choicesFrom` need `select` or `multiSelect`.
