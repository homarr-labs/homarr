import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { collectCustomWidgetRequestReferences, getCustomWidgetConfirmation } from "@homarr/custom-widgets/core";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";

/** Portable source carries request declarations, never installation IDs, URLs or credentials. */
export function convertLegacyWidgetSource(widget: HomarrCustomWidgetV2, packageId: string, name: string) {
  const capabilities = Object.entries(widget.requests).map(([id, request]) => ({
    id,
    kind: request.kind,
    method: request.method,
    trigger: request.trigger,
    minimumBoardPermission: request.permission,
    confirmation: getCustomWidgetConfirmation(request),
    invalidates: request.invalidates,
  }));
  const requests = Object.fromEntries(
    Object.entries(widget.requests).map(([id, request]) => [
      id,
      {
        request,
        sourceAuth: widget.sources[request.source]?.auth ?? "none",
        networkScope: widget.sources[request.source]?.networkScope ?? "private",
      },
    ]),
  );
  const files: Record<string, string> = {
    "parameters.json": JSON.stringify(
      Object.fromEntries(
        Object.entries(widget.requests).map(([id, request]) => [
          id,
          [...collectCustomWidgetRequestReferences(request).params],
        ]),
      ),
      null,
      2,
    ),
    "legacy.json": JSON.stringify({ template: widget.template, requestCapabilities: capabilities }, null, 2),
    "options.json": JSON.stringify(widget.options, null, 2),
    "requests.json": JSON.stringify(requests, null, 2),
    "tile.tsx": `import { LegacyWidget } from "@homarr/widget-sdk/legacy";\nimport legacy from "./legacy.json";\nexport default function Widget() { return <LegacyWidget {...legacy} />; }\n`,
    "configuration.tsx": `import { LegacyConfiguration } from "@homarr/widget-sdk/legacy";\nimport schema from "./options.json";\nimport parameterNames from "./parameters.json";\nexport default function Configuration() { return <LegacyConfiguration schema={schema} parameterNames={parameterNames} />; }\n`,
    "README.md": `# ${name}\n\nConverted from Custom JSX v2. The original definition and dashboard placements remain unchanged.\n\nThe tile preserves the original interpreter, supported components, inputs, load/manual requests, confirmations, invalidations, options, and configured refresh interval. Edit tile.tsx to progressively replace the compatibility component with unrestricted React and public SDK components. Requests are editable in requests.json and server.ts.\n\nNamed connections are configured locally. Exported source includes no connection URLs or saved credentials. Imported copies need connections configured before preview. Legacy API-key query authentication uses a query-auth connection whose encrypted secret key is the original query parameter name.\n\nGuest access is disabled by default. Review permissions, preview, and explicitly trust and activate this package before placing it on a dashboard.\n`,
  };
  const entrypoints: Record<string, string> = { tile: "tile.tsx", configuration: "configuration.tsx" };
  if (capabilities.length > 0) {
    entrypoints.server = "server.ts";
    files["server.ts"] =
      `import { defineWidgetServer } from "@homarr/widget-sdk/server";\nimport requests from "./requests.json";\nexport default defineWidgetServer(Object.fromEntries(Object.entries(requests).map(([name, specification]) => [name, async (input, context) => context.sdk.invoke("legacy.request", { ...specification, requestId: name, params: input?.params ?? {}, optionValues: input?.optionValues, confirmed: input?.confirmed === true })])));\n`;
  }
  return customWidgetPackageSchema.parse({
    $schema: "homarr-widget-package-v3",
    manifest: {
      id: packageId,
      version: "1.0.0",
      sdkVersion: "1",
      name,
      description: widget.description,
      icon: widget.iconUrl,
      tags: ["converted", "custom-jsx"],
      entrypoints,
      handlers: Object.fromEntries(
        Object.entries(widget.requests).map(([id, request]) => [
          id,
          {
            kind: request.kind,
            permission: request.permission,
            guestAccess: false,
            timeoutMs: 45_000,
          },
        ]),
      ),
    },
    files,
    dependencies: {},
    connections: Object.fromEntries(
      Object.entries(widget.sources).map(([id, source]) => [
        id,
        {
          label: source.name ?? id,
          kind: "http",
          description: `API source used by the converted widget. Authentication: ${typeof source.auth === "string" ? source.auth : `${source.auth.type} (${source.auth.name})`}.`,
        },
      ]),
    ),
    options: widget.options,
  });
}
