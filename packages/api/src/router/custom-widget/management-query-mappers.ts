import type { InferSelectModel } from "drizzle-orm";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { customWidgetDefinitions, customWidgetSecrets, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import {
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  getCustomWidgetSecretRequirements,
} from "@homarr/custom-widgets/core";

import { safeParseStoredCustomWidgetDefinition } from "./stored-definition";

const logger = createLogger({ module: "custom-widget:management" });

type StoredDefinition = InferSelectModel<typeof customWidgetDefinitions>;
type StoredSecret = InferSelectModel<typeof customWidgetSecrets>;
type LegacyDefinition = InferSelectModel<typeof legacyCustomWidgetDefinitions>;

export function mapCustomWidgetListItem(definition: StoredDefinition & { secrets: readonly StoredSecret[] }) {
  const result = safeParseStoredCustomWidgetDefinition(definition);
  if (!result.success) {
    logger.warn("Skipped parsing invalid custom widget definition", {
      event: "custom_widget_definition_invalid",
      id: definition.id,
      issueCount: result.issues.length,
    });
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description ?? undefined,
      iconUrl: definition.iconUrl ?? undefined,
      sources: [],
      requestCount: 0,
      missingSecrets: [],
      options: {},
      updatedAt: definition.updatedAt,
      enabled: definition.enabled,
      valid: false as const,
      migrationRequired: false as const,
      validationIssues: result.issues,
    };
  }

  const widget = result.widget;
  const configuredSecrets = new Set(definition.secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
  return {
    id: definition.id,
    name: widget.name,
    description: widget.description,
    iconUrl: widget.iconUrl,
    sources: Object.entries(widget.sources).map(([id, { name, baseUrl, networkScope, auth }]) => ({
      id,
      name,
      origin: new URL(baseUrl).origin,
      networkScope,
      authType: typeof auth === "string" ? auth : auth.type,
    })),
    requestCount: Object.keys(widget.requests).length,
    missingSecrets: getCustomWidgetSecretRequirements(widget.sources).filter(
      (requirement) => !configuredSecrets.has(`${requirement.sourceId}:${requirement.kind}`),
    ),
    options: widget.options,
    updatedAt: definition.updatedAt,
    enabled: definition.enabled,
    valid: true as const,
    migrationRequired: false as const,
    validationIssues: [],
  };
}

export function mapLegacyCustomWidgetListItem(definition: LegacyDefinition) {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? undefined,
    iconUrl: definition.iconUrl ?? undefined,
    sources: [{ id: "default", name: "Legacy API", origin: safeOrigin(definition.url), authType: definition.authType }],
    requestCount: 1,
    missingSecrets: [],
    options: {},
    updatedAt: definition.updatedAt,
    enabled: false,
    valid: false as const,
    migrationRequired: true as const,
    validationIssues: [],
  };
}

export function mapAvailableCustomWidget(definition: StoredDefinition) {
  const result = safeParseStoredCustomWidgetDefinition(definition);
  if (!result.success) {
    logger.warn("Excluded invalid custom widget definition from board picker", {
      event: "custom_widget_definition_invalid",
      id: definition.id,
      surface: "board-picker",
    });
    return [];
  }

  const widget = result.widget;
  return [
    {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      options: widget.options,
      defaultOptions: getCustomWidgetDefaultOptions(widget.options),
      template: widget.template,
      sources: Object.entries(widget.sources).map(([id, { name, networkScope, auth }]) => ({
        id,
        name,
        networkScope,
        authType: typeof auth === "string" ? auth : auth.type,
      })),
      requestCapabilities: Object.entries(widget.requests).map(
        ([id, { kind, method, trigger, permission, confirmation, invalidates }]) => ({
          id,
          kind,
          method,
          trigger,
          minimumBoardPermission: permission,
          confirmation: getCustomWidgetConfirmation({ method, confirmation }),
          invalidates,
        }),
      ),
      optionRequests: Object.entries(widget.requests).flatMap(([id, request]) =>
        request.kind === "query" ? [{ id }] : [],
      ),
      updatedAt: definition.updatedAt,
      migrationRequired: false as const,
    },
  ];
}

export function mapLegacyAvailableCustomWidget(definition: LegacyDefinition) {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl,
    options: {},
    defaultOptions: {},
    template: "",
    sources: [],
    requestCapabilities: [],
    optionRequests: [],
    updatedAt: definition.updatedAt,
    migrationRequired: true as const,
  };
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "Invalid legacy URL";
  }
}
