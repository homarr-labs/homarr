# P2/P3/P4/P5 source-view publication — exact declaration lease

## Authority and before evidence retained before publication

Read the newest publication amendment at `FRONTEND-PRESENTATION-LEASES.md:7–15` and the four canonical `source-presentation-P2.md` through `source-presentation-P5.md` handoffs. This is the fresh publication-only lease for independently accepted/frozen leaves, not reactivation of older broad UI/form/modal scopes. Those historical handoffs' unexported status describes their extraction-time boundary; the newest amendment alone authorizes these four barrels and matching manifest fields.

Before editing, a dedicated `packages/ui/src/source-views/**/index.ts` glob returned no files. Directory reads of all four domains showed their accepted leaves/contracts and no `index.ts`. This canonical handoff was absent. The manifest had exactly nine exports and none of the four new source-view keys. No existing barrel/field was overwritten.

The exact complete `packages/ui/package.json` before-image read before any publication patch is retained below. All fields outside the four additions must remain identical, including the existing nine export mappings, typesVersions, scripts and dependencies.

```json
{
  "name": "@homarr/ui",
  "version": "0.1.0",
  "private": true,
  "license": "Apache-2.0",
  "type": "module",
  "typesVersions": {
    "*": {
      "*": ["src/*"]
    }
  },
  "exports": {
    ".": "./index.ts",
    "./integration-select-grid": "./src/integration-select-grid/index.ts",
    "./widget-icons": "./src/widget-icons.ts",
    "./styles.css": "./src/styles.css",
    "./hooks": "./src/hooks/index.ts",
    "./navigation": "./src/navigation/index.tsx",
    "./theme": "./src/theme.ts",
    "./language-combobox": "./src/components/language-combobox.tsx",
    "./icons": "./src/icons/index.ts"
  },
  "scripts": {
    "clean": "rm -rf .turbo node_modules",
    "format": "oxfmt .",
    "lint": "oxlint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@homarr/common": "workspace:^0.1.0",
    "@homarr/definitions": "workspace:^0.1.0",
    "@homarr/server-settings": "workspace:^0.1.0",
    "@homarr/settings": "workspace:^0.1.0",
    "@homarr/translation": "workspace:^0.1.0",
    "@homarr/validation": "workspace:^0.1.0",
    "@mantine/core": "catalog:",
    "@mantine/dates": "catalog:",
    "@mantine/hooks": "catalog:",
    "@tabler/icons-react": "catalog:",
    "@tanstack/react-query": "catalog:",
    "crypto-js": "catalog:",
    "mantine-react-table": "catalog:",
    "next": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "svgson": "catalog:"
  },
  "devDependencies": {
    "@homarr/tsconfig": "workspace:^0.1.0",
    "@types/crypto-js": "catalog:",
    "@types/css-modules": "catalog:",
    "typescript": "catalog:"
  }
}
```

## Exact added fields and target proof

| Public specifier                              | New manifest field                   | New actual target                                 |
| --------------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| `@homarr/ui/source-views/identity-settings`   | `./source-views/identity-settings`   | `./src/source-views/identity-settings/index.ts`   |
| `@homarr/ui/source-views/connections`         | `./source-views/connections`         | `./src/source-views/connections/index.ts`         |
| `@homarr/ui/source-views/recovery-operations` | `./source-views/recovery-operations` | `./src/source-views/recovery-operations/index.ts` |
| `@homarr/ui/source-views/custom-workbench`    | `./source-views/custom-workbench`    | `./src/source-views/custom-workbench/index.ts`    |

Before: all four listed fields and target indexes were absent. After: all four fields map to the exact listed new indexes, individually reread after publication. Each forwards explicit existing named values from sibling accepted leaves and explicit named types from its existing types-only `contracts.ts`. All sibling modules existed in the before-directory listings; their actual exported names and contract declarations were read before publication. No export-star, invented helper/type, renamed external original specifier, backend/API/controller type, root-barrel expansion or CSS subpath was added.

## Exact named export inventory

Paths in each table are sibling modules relative to that domain's new `index.ts`. There are **24 existing values and 37 existing named types**, not new component implementations, manufactured models or reconstructed signatures.

### Identity settings — P2

| Value name               | Existing source module        |
| ------------------------ | ----------------------------- |
| `StepperNavigationView`  | `./stepper-navigation-view`   |
| `ReservedGroupAlertView` | `./reserved-group-alert-view` |
| `SettingSwitchView`      | `./setting-switch-view`       |

Explicit `export type` from `./contracts`: `IdentitySettingsLinkProps`, `IdentitySettingsLinkComponent`, `StepperNavigationViewProps`, `ReservedGroupAlertViewProps`, `SettingSwitchViewProps`.

The existing anchor-compatible link/component types are included unchanged; no new navigation/controller interface or original wrapper symbol is manufactured.

### Connections — P3

| Value name                   | Existing source module            |
| ---------------------------- | --------------------------------- |
| `AppItemView`                | `./app-item-view`                 |
| `IntegrationSecretCardView`  | `./integration-secret-card-view`  |
| `IntegrationSecretKindsView` | `./integration-secret-kinds-view` |
| `CertificateUploadView`      | `./certificate-upload-view`       |
| `CertificateDetailsView`     | `./certificate-details-view`      |
| `PemContentView`             | `./pem-content-view`              |

Explicit `export type` from `./contracts`: `AppItemSlots`, `AppItemViewProps`, `IntegrationSecretDisplay`, `IntegrationSecretCardViewProps`, `IntegrationSecretKindsViewProps`, `CertificateFileInputBinding`, `CertificateUploadViewProps`, `CertificateDetailsViewProps`, `PemContentViewProps`.

The frozen component slot/ref/file binding and public-versus-redacted display union remain their actual provided presentation types; no backend certificate/secret DTO or action authority is published.

### Recovery operations — P4

| Value name                    | Existing source module            |
| ----------------------------- | --------------------------------- |
| `DangerousActionConfirmation` | `./dangerous-action-confirmation` |
| `RestoreConfirmationView`     | `./restore-confirmation-view`     |
| `RestoreProgressView`         | `./restore-progress-view`         |
| `BackupPreviewView`           | `./backup-preview-view`           |
| `LogFontSizeView`             | `./log-font-size-view`            |
| `LogLevelView`                | `./log-level-view`                |
| `TaskStatusBadgeView`         | `./task-status-badge-view`        |

Explicit `export type` from `./contracts`: `DangerousActionConfirmationProps`, `RestoreConfirmationViewProps`, `RestoreProgressStatus`, `RestoreProgressViewProps`, `BackupPreviewDisplayRow`, `BackupPreviewDisplayRows`, `BackupPreviewViewProps`, `LogFontSizeViewProps`, `LogLevelDisplayValue`, `LogLevelDisplayOption`, `LogLevelViewProps`, `TaskStatusBadgeViewProps`.

Generic display-row/level-option types retain their existing generic constraints, and the ordered source display tuples are forwarded, not reconstructed or promoted to backup/log API models.

### Custom workbench — P5

| Value name                          | Existing source module      |
| ----------------------------------- | --------------------------- |
| `EditorSection`                     | `./editor-section`          |
| `SaveActions`                       | `./save-actions-view`       |
| `CustomWidgetSectionNavigation`     | `./section-navigation-view` |
| `PreviewResult`, `PreviewStatusDot` | `./preview-status-view`     |
| `CustomWidgetPreviewSizeControl`    | `./preview-size-control`    |
| `CustomWidgetSaveIssuesAlert`       | `./save-issues-view`        |
| `LazyOnceAccordion`                 | `./lazy-once-accordion`     |

Explicit `export type` from `./contracts`: `CustomWidgetSectionId`, `EditorSectionProps`, `SaveActionsProps`, `CustomWidgetSectionNavigationProps`, `PreviewOutcome`, `PreviewResultProps`, `PreviewStatusDotProps`, `CustomWidgetPreviewSizeControlProps`, `CustomWidgetSaveIssueView`, `CustomWidgetSaveIssuesAlertProps`, `LazyOnceAccordionProps`.

No internal size-content component, section-link table, preview-summary helper, save-error parser, form controller, editor/runtime type or CSS export is exposed. Internal stylesheet imports in accepted leaves remain untouched; this publication does not admit a stylesheet consumer/pipeline join.

## After manifest and unchanged-field evidence

The manifest was reread after the exact four-field patch. Its exports now contain these thirteen mappings:

```json
{
  ".": "./index.ts",
  "./integration-select-grid": "./src/integration-select-grid/index.ts",
  "./widget-icons": "./src/widget-icons.ts",
  "./styles.css": "./src/styles.css",
  "./hooks": "./src/hooks/index.ts",
  "./navigation": "./src/navigation/index.tsx",
  "./theme": "./src/theme.ts",
  "./language-combobox": "./src/components/language-combobox.tsx",
  "./icons": "./src/icons/index.ts",
  "./source-views/identity-settings": "./src/source-views/identity-settings/index.ts",
  "./source-views/connections": "./src/source-views/connections/index.ts",
  "./source-views/recovery-operations": "./src/source-views/recovery-operations/index.ts",
  "./source-views/custom-workbench": "./src/source-views/custom-workbench/index.ts"
}
```

Manual comparison with the retained before-image confirms that removing exactly these four additions leaves the original nine export fields and values unchanged. The existing `./icons` mapping acquired only the JSON comma required to append fields. `name`, `version`, `private`, `license`, `type`, `typesVersions`, all scripts, all dependencies and all devDependencies remain exactly as recorded above, with no other field change. No root barrel, CSS subpath, source leaf, original wrapper, Nitro feature, other manifest or lockfile was written. This is direct read/patch/reread evidence, not a computed hash/diff/whole-manifest audit or executable resolver proof.

## Frozen declaration-only disposition and review gate

The owned publication is complete and frozen for independent declaration review: four new indexes, four matching export fields, this canonical handoff. All value/type names are forwarded without aliases or casts. No comments, tests, new dependencies or library/component code were introduced.

Only reads/searches and patches were performed. **No checks, lint, typecheck, format command, build, install, tests, import evaluation, network/provider/SQL/browser, environment/credential/data access, listener, Git mutation or nested agent was used.** No compilation, actual browser/full-runtime graph, CSS pipeline, original delegation, resource authority or feature-readiness claim follows.

Independent declaration review must pass before any fresh exact P2 original-wrapper delegation lease. This task activates no wrappers or routes. P3/P4/P5 consumer/CSS rewiring and all native/helper/controller/resource joins remain separately held; publication does not supersede their source-preservation and authorization boundaries.
