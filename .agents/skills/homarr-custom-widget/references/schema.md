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

Sources require `default`. A request defaults to the default source, query, GET, load, inherited auth, and view permission. An action defaults to manual and modify permission. DELETE uses full permission and confirmation.

Use stable real URLs for public APIs and clear suggested URLs for self-hosted services. Homarr collects the installer's server URL, network scope, and credentials as source setup; credentials remain outside the manifest.

Paths use `{option:name}` and `{param:name}`. Query/body data uses `{ "$option": "name" }` and `{ "$param": "name" }`. Load queries cannot use params. Runtime parameter names and primitive values are inferred from references.

Every option has `label`, `control`, and `default`. Optional fields are `description`, `choices`, `choicesFrom`, `min`, `max`, `step`, `advanced`, and `group`.
