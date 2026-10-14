# Convergence W — optional-property consumer views frozen

Only `apps/nitro/src/features/widgets-editor/add-widget.tsx` and `apps/nitro/src/features/widgets-runtime/host.tsx` were changed. This new report was absence-checked before creation. The named fresh `nitro-convergence-next-1tPGwLQS/nitro.stdout` was read only for these paths' optional-union diagnostics; no compiler or command was run.

## Applied source diff

`apps/nitro/src/features/widgets-editor/add-widget.tsx`:

```diff
-    .filter(
-      (kind) =>
+    .filter((kind) => {
+      const definitionView: WidgetDefinition | undefined = catalog.data?.get(kind);
+      return (
         domain.widgetName(kind).toLowerCase().includes(query) ||
-        (catalog.data?.get(kind)?.supportedIntegrations ?? []).some((integration) =>
+        (definitionView?.supportedIntegrations ?? []).some((integration) =>
           domain.integrationName(integration).toLowerCase().includes(query),
-        ),
-    )
+        )
+      );
+    })
```

```diff
       const definition = await domain.loadWidgetDefinition(kind);
       if (!origin.isCurrent()) return;
-      const supported = definition.supportedIntegrations ?? [];
+      const definitionView: WidgetDefinition = definition;
+      const supported = definitionView.supportedIntegrations ?? [];
       const current =
         "supportedIntegrations" in definition ? (integrations.data ?? (await integrations.refetch()).data) : [];
```

```diff
-      const maximum = definition.maxIntegrations ?? Infinity;
-      if ("supportedIntegrations" in definition && definition.integrationsRequired !== false && matching.length === 0) {
+      const maximum = definitionView.maxIntegrations ?? Infinity;
+      if (
+        "supportedIntegrations" in definition &&
+        definitionView.integrationsRequired !== false &&
+        matching.length === 0
+      ) {
```

```diff
-                const definition = catalog.data?.get(kind);
-                const supported = (definition?.supportedIntegrations ?? []).filter(
+                const definitionView: WidgetDefinition | undefined = catalog.data?.get(kind);
+                const supported = (definitionView?.supportedIntegrations ?? []).filter(
```

`apps/nitro/src/features/widgets-runtime/host.tsx`:

```diff
   WidgetComponentProps,
   WidgetDataStatus,
+  WidgetDefinition,
   WidgetOptionsSettings,
```

```diff
   const definition = use(props.definitionManifest.loadWidgetDefinition(props.kind));
+  const definitionView: WidgetDefinition = definition;
```

```diff
-            required={definition.integrationsRequired !== false && Boolean(definition.supportedIntegrations?.length)}
+            required={
+              definitionView.integrationsRequired !== false && Boolean(definitionView.supportedIntegrations?.length)
+            }
```

## Preserved boundaries

The views are type annotations of the same actual objects, not copies, optional-field insertions, DTOs or casts. Raw canonical `definition` values still feed default reduction and selection, and raw kind/option inference and the manifest instance type remain unchanged. Both fetching and required selection still check `"supportedIntegrations" in definition` on the ORIGINAL object. `integrationsRequired !== false`, `maxIntegrations ?? Infinity`, mock filters, permissions, captured picker origins and every late-await/currentness check are unchanged.

The host still passes the actual manifest's cached promise directly to React `use`; no promise wrapper/cache change was made. UI, styles, Renderer injection, actions, query ownership and recovery remain unchanged. Ownership contracts and all nine static holds remain intact; no production mount or resource activation was added.

Both source paths are frozen for rereview. All other sources/manifests were read-only. No commands/checks/lint/typecheck, tests, installs/builds, native/runtime/provider operations, environment/data/credentials, Git or nested agents were used. Coordinator must rerun its focused validation after reached writers freeze; this handoff does not claim the diagnostics have been compiler-verified as resolved.
