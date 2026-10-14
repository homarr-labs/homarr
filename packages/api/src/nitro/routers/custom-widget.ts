import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common/id";
import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import {
  CUSTOM_WIDGET_SKILL_REFERENCE_NAMES,
  findCustomWidgetComponents,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
} from "@homarr/custom-widgets/authoring-resources";
import {
  applyCustomWidgetSourceSetup,
  CUSTOM_WIDGET_SCHEMA,
  customJsxTemplateSchema,
  customWidgetAuthoringDefinitionSchema,
  customWidgetCreateSchema,
  customWidgetDefinitionSchema,
  customWidgetIdentifierSchema,
  customWidgetImportSchema,
  customWidgetSecretInputSchema,
  customWidgetSecretsInputSchema,
  customWidgetSourceSchema,
  customWidgetTemplateLinesSchema,
  customWidgetUpdateSchema,
  exportCustomWidgetDefinition,
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  getCustomWidgetJsonSchema,
  getCustomWidgetSecretRequirements,
  getCustomWidgetSourceAuthType,
  getCustomWidgetSourceSetups,
  getCustomWidgetTemplateDigest,
  normalizeCustomJsxAuthoringTemplate,
  normalizeCustomWidgetAuthoringDefinition,
  normalizeCustomWidgetAuthoringUpdate,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";
import { addCustomJsxDiagnosticSourceExcerpts, validateCustomJsxTemplate } from "@homarr/custom-widgets/jsx/analyzer";
import { validateWorkshopWidget } from "@homarr/workshop/schema";

import { authenticatedProcedure, sourceProjectionMeta } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";
import {
  assertCurrentPreviewEvidence,
  assertSecretSources,
  buildLegacyCustomWidgetMigrationPrompt,
  canPreserveLegacySecrets,
  createCustomWidgetHelpers,
  getAffectedRowCount,
  getCreatedCustomWidgetResult,
  getCustomWidgetCacheVersion,
  getCustomWidgetDefinitionStateFingerprint,
  getPreviewEvidenceChecklist,
  getRequiredSourceConfigurations,
  getTemplateRevision,
  hasSameSecretBinding,
  hashRuntimeParams,
  invalidateCustomWidgetResponseCache,
  mapLegacyAvailableCustomWidget,
  mapLegacyCustomWidgetListItem,
  parseCustomWidgetAuthoringInput,
  parseLegacyDisplayConfig,
  parsePreviewDefinition,
  parseStoredCustomWidgetDefinition,
  renderRequestBody,
  renderRequestTarget,
  requiredSecretKinds,
  resolveCustomWidgetRequestValues,
  resolveOptionRequestValues,
  safeParseStoredCustomWidgetDefinition,
  serializeCustomWidgetDefinition,
  validateTemplate,
} from "./-custom-widgets/helpers";
import type { CustomWidgetProcedureResources } from "./-custom-widgets/resources";

export type { CustomWidgetProcedureResources, CustomWidgetAuthorityLease } from "./-custom-widgets/resources";

export const customWidgetPurePreparedPaths = [
  "customWidget.schema",
  "customWidget.getAuthoringPrompt",
  "customWidget.getSkill",
  "customWidget.getReference",
  "customWidget.getComponentCatalog",
  "customWidget.findComponents",
  "customWidget.getComponent",
  "customWidget.getComponents",
  "customWidget.getSharedProps",
  "customWidget.getExample",
  "customWidget.validateTemplate",
  "customWidget.validate",
] as const;

export const customWidgetBindingHeldPaths = [
  "customWidget.list",
  "customWidget.legacyMigrationPrompt",
  "customWidget.get",
  "customWidget.available",
  "customWidget.optionRequest",
  "customWidget.create",
  "customWidget.createFromPreview",
  "customWidget.updateFromPreview",
  "customWidget.update",
  "customWidget.secretSet",
  "customWidget.sourceConfigure",
  "customWidget.configurationRequestUser",
  "customWidget.secretClear",
  "customWidget.workshopSearch",
  "customWidget.workshopGet",
  "customWidget.workshopInstall",
  "customWidget.toggleEnabled",
  "customWidget.delete",
  "customWidget.duplicate",
  "customWidget.readTemplate",
  "customWidget.writeTemplate",
  "customWidget.templatePatch",
  "customWidget.export",
  "customWidget.exportLegacy",
  "customWidget.import",
  "customWidget.migrateLegacy",
  "customWidget.previewCreate",
  "customWidget.previewReviseTemplate",
  "customWidget.previewGet",
  "customWidget.previewRefresh",
  "customWidget.previewQuery",
  "customWidget.setPreviewLiveActions",
  "customWidget.previewJournal",
  "customWidget.previewAction",
] as const;

export const customWidgetPreparedPaths = [...customWidgetPurePreparedPaths, ...customWidgetBindingHeldPaths] as const;

type CustomWidgetQueryPath = Extract<
  SourceProcedureDescriptor,
  { path: `customWidget.${string}`; kind: "query" }
>["path"];
type CustomWidgetMutationPath = Extract<
  SourceProcedureDescriptor,
  { path: `customWidget.${string}`; kind: "mutation" }
>["path"];

const customWidgetTemplateMaxLength = 50_000;
const customWidgetTemplateValidationInputSchema = z
  .strictObject({
    template: z.string().min(1).max(customWidgetTemplateMaxLength).optional(),
    templateLines: z.array(z.string().max(10_000)).min(1).max(2_000).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.template === undefined && input.templateLines === undefined)
      ctx.addIssue({ code: "custom", message: "Provide template or templateLines" });
    if (input.template !== undefined && input.templateLines !== undefined)
      ctx.addIssue({ code: "custom", path: ["templateLines"], message: "Provide only one template format" });
    const joinedLength = input.templateLines?.reduce((length, line) => length + line.length + 1, 0) ?? 0;
    if (joinedLength > customWidgetTemplateMaxLength)
      ctx.addIssue({
        code: "custom",
        path: ["templateLines"],
        message: `The JSX template must contain at most ${customWidgetTemplateMaxLength} characters`,
      });
  });

const secretRequestInputSchema = z
  .object({
    requestId: z
      .string()
      .optional()
      .describe("Check an existing configuration request by its returned requestId. Omit every other field."),
    definitionId: z
      .string()
      .optional()
      .describe("Create configuration for a saved widget. Requires sourceId; omit requestId and previewSessionId."),
    previewSessionId: z
      .string()
      .optional()
      .describe(
        "Create configuration for a preview returned by previewCreate. Requires sourceId; omit requestId and definitionId.",
      ),
    sourceId: z
      .string()
      .optional()
      .describe("Source key from sourceConfigurations, used only when creating a configuration request."),
  })
  .superRefine((input, ctx) => {
    if (input.requestId) {
      if (input.definitionId || input.previewSessionId || input.sourceId)
        ctx.addIssue({ code: "custom", message: "Status checks only accept requestId" });
      return;
    }
    if (Boolean(input.definitionId) === Boolean(input.previewSessionId))
      ctx.addIssue({ code: "custom", message: "Provide exactly one definitionId or previewSessionId" });
    if (!input.sourceId) ctx.addIssue({ code: "custom", message: "sourceId is required" });
  });

const workshopSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sort: z.enum(["top", "newest", "recent", "discussed"]).default("top"),
  limit: z.number().int().min(1).max(20).default(10),
});
const sourceOverridesSchema = z.record(
  customWidgetIdentifierSchema,
  z.strictObject({
    baseUrl: z.string().optional(),
    integrationId: z.string().min(1).max(100).optional(),
    networkScope: z.enum(["public", "private", "loopback"]).optional(),
  }),
);
const previewCreateInputSchema = z.object({
  definition: customWidgetAuthoringDefinitionSchema,
  secrets: customWidgetSecretsInputSchema.default([]),
  definitionId: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
const previewReviseTemplateInputSchema = z
  .strictObject({
    sessionId: z.string().min(1),
    expectedRevision: z.number().int().nonnegative().optional(),
    template: customJsxTemplateSchema.optional(),
    templateLines: customWidgetTemplateLinesSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.template === undefined && input.templateLines === undefined)
      ctx.addIssue({ code: "custom", path: ["template"], message: "Provide template or templateLines" });
    if (input.template !== undefined && input.templateLines !== undefined)
      ctx.addIssue({ code: "custom", path: ["templateLines"], message: "Provide template or templateLines, not both" });
  });
const previewSessionRequestSchema = z.object({
  sessionId: z.string().min(1).describe("The previewSession.id returned by customWidget_previewCreate."),
  requestId: z
    .string()
    .min(1)
    .max(64)
    .describe("One query requestId from customWidget_previewCreate.queries. Test every returned query."),
  params: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({})
    .describe("Invocation parameters required by a manual query. Load queries use an empty object."),
});

export function createCustomWidgetProcedures(resources: CustomWidgetProcedureResources) {
  const { customWidgetDefinitions, customWidgetSecrets, legacyCustomWidgetDefinitions, boards } = resources.tables;
  const { and, eq, or, handleTransactionsAsync } = resources.operators;
  const { logger, workshop } = resources;
  const {
    decryptSecret,
    encryptSecret,
    createPreviewSession,
    getPreviewSession,
    getPreviewEvidence,
    getPreviewJournal,
    revisePreviewSessionTemplate,
    setPreviewSessionLiveActions,
    getPersistedPreviewSecrets,
    recordPreviewJournal,
    acquireCustomWidgetRequestLimit,
    executeCustomWidgetRequest,
    throwIfActionForbiddenAsync,
    assertCustomWidgetIntegrationBindings,
    resolveCustomWidgetSource,
    getPreviewRequestSource,
    getPreviewRequestSourceConfigurationFailure,
    insertCustomWidgetDefinition,
    updateCustomWidgetDefinition,
    setCustomWidgetSecret,
    configureCustomWidgetSource,
    clearCustomWidgetSecret,
    createCustomWidgetConfigurationRequest,
    getCustomWidgetConfigurationRequestForUser,
    mapCustomWidgetListItem,
    mapAvailableCustomWidget,
  } = createCustomWidgetHelpers(resources);
  const query = (path: CustomWidgetQueryPath) =>
    authenticatedProcedure({
      path,
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    });
  const mutation = (path: CustomWidgetMutationPath) =>
    authenticatedProcedure({
      path,
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    });
  const acquireAuthority = async (context: Parameters<CustomWidgetProcedureResources["acquireAuthorityAsync"]>[0]) => {
    const authority = await resources.acquireAuthorityAsync(context);
    if (
      authority.principal.user.id !== context.principal.user.id ||
      authority.identity.userId !== authority.principal.user.id ||
      !authority.principal.user.permissions.includes("admin") ||
      !authority.identity.permissions.includes("admin")
    ) {
      await authority.releaseAsync();
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
    }
    return authority;
  };
  const boundQuery = (path: CustomWidgetQueryPath) =>
    query(path).use(async ({ context, next }) => {
      const authority = await acquireAuthority(context);
      try {
        return await next({
          context: { db: authority.db, principal: authority.principal, customWidgetAuthority: authority },
        });
      } finally {
        await authority.releaseAsync();
      }
    });
  const boundMutation = (path: CustomWidgetMutationPath) =>
    mutation(path).use(async ({ context, next }) => {
      const authority = await acquireAuthority(context);
      try {
        return await next({
          context: { db: authority.db, principal: authority.principal, customWidgetAuthority: authority },
        });
      } finally {
        await authority.releaseAsync();
      }
    });
  const getWorkshopSubmissionUrl = (submissionId: string) =>
    `${resources.workshopWebUrl}/${encodeURIComponent(submissionId)}`;
  function throwWorkshopUnavailable(
    message: string,
    event: "workshop_widget_lookup_failed" | "workshop_widget_search_failed",
  ): never {
    logger.error(message, { event, errorName: "WorkshopBackendError" });
    throw new ORPCError("BAD_GATEWAY", { message: "Workshop is unavailable" });
  }
  async function getWorkshopWidget(submissionId: string) {
    try {
      const submission = await workshop.get(submissionId);
      if (submission.type !== "customWidget" || submission.widgetSchema !== CUSTOM_WIDGET_SCHEMA)
        throw new ORPCError("BAD_REQUEST", { message: "Workshop submission is not a compatible Custom JSX widget" });
      const validation = validateWorkshopWidget(submission.content);
      if (!validation.success) throw new ORPCError("BAD_REQUEST", { message: validation.error });
      return { submission, widget: exportCustomWidgetDefinition(validation.data) };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      throwWorkshopUnavailable("Workshop widget lookup failed", "workshop_widget_lookup_failed");
    }
  }

  return {
    schema: query("customWidget.schema")
      .meta(
        sourceProjectionMeta({ mcp: { enabled: true, description: "Get the current Custom JSX widget JSON Schema." } }),
      )
      .handler(() => getCustomWidgetJsonSchema()),
    getAuthoringPrompt: query("customWidget.getAuthoringPrompt")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Get the current Custom Widget authoring instructions." },
        }),
      )
      .handler(() => ({
        version: 2,
        prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
        resources: [
          "homarr://custom-widgets/schema",
          "homarr://custom-widgets/components",
          "homarr://custom-widgets/skill",
          "homarr://custom-widgets/references/{schema|runtime|security}",
        ],
        httpResources: [
          "/api/custom-widgets/schema",
          "/api/custom-widgets/components",
          "/api/custom-widgets/skill",
          "/api/custom-widgets/reference-{schema|runtime|security}",
        ],
      })),
    getSkill: query("customWidget.getSkill")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Load the compact Homarr Custom Widget authoring entrypoint and its reference index. Fetch only a named reference needed by the current design with customWidget_getReference.",
          },
        }),
      )
      .handler(() => getCustomWidgetSkillEntrypoint()),
    getReference: query("customWidget.getReference")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Load one named Custom Widget authoring reference. Use schema for manifest syntax, runtime for interactions, or security for authentication and interpreter constraints.",
          },
        }),
      )
      .input(z.object({ name: z.enum(CUSTOM_WIDGET_SKILL_REFERENCE_NAMES) }))
      .handler(({ input }) => getCustomWidgetSkillReference(input.name)),
    getComponentCatalog: query("customWidget.getComponentCatalog")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "List a compact index of supported Custom JSX component names, categories, shared prop names, safety policies, and example IDs. Fetch only the named details needed for the widget.",
          },
        }),
      )
      .handler(() => getCustomWidgetComponentCatalog()),
    findComponents: query("customWidget.findComponents")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Find a small release-matched Custom JSX component subset by name or capability. Prefer this over loading the complete catalog when the intended UI is already known.",
          },
        }),
      )
      .input(
        z.object({
          query: z.string().trim().min(2).max(240),
          limit: z
            .number()
            .int()
            .min(1)
            .max(16)
            .default(16)
            .describe("Maximum matches. Search again for a different capability when needed."),
        }),
      )
      .handler(({ input }) => findCustomWidgetComponents(input.query, input.limit)),
    getComponent: query("customWidget.getComponent")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get one installed Custom JSX component document to resolve a concrete repair. Prefer customWidget_getComponents for a planned set.",
          },
        }),
      )
      .input(z.object({ name: z.string().trim().min(1).max(128).describe("A component name from the catalog.") }))
      .handler(({ input }) => {
        const component = getCustomWidgetComponent(input.name);
        if (!component) throw new ORPCError("NOT_FOUND", { message: "Custom JSX component not found" });
        return component;
      }),
    getComponents: query("customWidget.getComponents")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get compact installed documentation for up to eight selected Custom JSX components in one batch. Full single-component details remain available for a concrete unresolved prop or repair.",
          },
        }),
      )
      .input(
        z.object({
          names: z
            .array(z.string().trim().min(1).max(128))
            .min(1)
            .max(8)
            .describe("Selected component names from customWidget_findComponents."),
        }),
      )
      .handler(({ input }) => getCustomWidgetComponents(input.names)),
    getSharedProps: query("customWidget.getSharedProps")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get documentation for only the named shared Custom JSX props. Collect the shared prop names needed by all selected components and fetch them together once.",
          },
        }),
      )
      .input(
        z.object({
          names: z
            .array(z.string().trim().min(1).max(128))
            .min(1)
            .max(64)
            .describe("Shared prop names from customWidget_getComponentCatalog.sharedProps.names."),
        }),
      )
      .handler(({ input }) => getCustomWidgetSharedProps(input.names)),
    getExample: query("customWidget.getExample")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get one installed Custom JSX example by its catalog ID. Fetch only an example relevant to the requested interaction pattern.",
          },
        }),
      )
      .input(z.object({ name: z.string().trim().min(1).max(128).describe("An example ID from the catalog.") }))
      .handler(({ input }) => {
        const example = getCustomWidgetExample(input.name);
        if (!example) throw new ORPCError("NOT_FOUND", { message: "Custom JSX example not found" });
        const { template, ...widget } = example.widget;
        return { ...example, widget: { ...widget, templateLines: template.split("\n") } };
      }),
    validateTemplate: query("customWidget.validateTemplate")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Optionally validate only a Custom JSX template for focused parser, component, interpreter, and safety diagnostics. Prefer templateLines and never pass both formats. previewCreate already validates the complete manifest and does not require this call first.",
          },
        }),
      )
      .input(customWidgetTemplateValidationInputSchema)
      .handler(({ input }) => {
        const rawTemplate = input.template ?? input.templateLines?.join("\n") ?? "";
        const template = normalizeCustomJsxAuthoringTemplate(rawTemplate);
        const diagnostics = addCustomJsxDiagnosticSourceExcerpts(template, validateCustomJsxTemplate(template));
        const valid = diagnostics.every((diagnostic) => diagnostic.severity !== "error");
        const hasUnknownProp = diagnostics.some((diagnostic) => diagnostic.message.startsWith("UNKNOWN_MANTINE_PROP"));
        let nextStep =
          "Send the complete definition to customWidget_previewCreate for full validation and a testable preview.";
        if (!valid)
          nextStep = "Repair the reported JSX errors, then send the corrected complete definition to previewCreate.";
        else if (hasUnknownProp)
          nextStep = "Repair unknown component props before previewing; they may be ignored by the installed release.";
        return {
          valid,
          templateDigest: getCustomWidgetTemplateDigest(template),
          validationId: `template:${getCustomWidgetTemplateDigest(template)}`,
          normalizedCharacters: rawTemplate.length - template.length,
          diagnostics,
          summary: { characters: template.length, lines: template.split("\n").length },
          nextStep,
        };
      }),
    validate: query("customWidget.validate")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Validate one complete Custom JSX widget without saving it. Multiline JSX may be supplied as templateLines; the result returns precise issue paths to repair before previewing.",
          },
        }),
      )
      .input(
        z.object({
          widget: z
            .unknown()
            .describe("A complete Homarr Custom Widget v2 definition using either template or templateLines."),
        }),
      )
      .handler(({ input }) => {
        const result = customWidgetAuthoringDefinitionSchema.safeParse(input.widget);
        if (!result.success)
          return {
            valid: false as const,
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String).join("."),
              code: issue.code,
              message: issue.message,
            })),
          };
        try {
          const widget = normalizeCustomWidgetAuthoringDefinition(result.data);
          return {
            valid: true as const,
            issues: [],
            summary: {
              name: widget.name,
              sourceIds: Object.keys(widget.sources),
              requestIds: Object.keys(widget.requests),
              optionIds: Object.keys(widget.options),
              templateLineCount: widget.template.split("\n").length,
            },
            nextStep:
              "Reuse the validated authoring definition with customWidget_previewCreate, then run every returned query.",
          };
        } catch (error) {
          if (error instanceof z.ZodError)
            return {
              valid: false as const,
              issues: error.issues.map((issue) => ({
                path: issue.path.map(String).join("."),
                code: issue.code,
                message: issue.message,
              })),
            };
          throw error;
        }
      }),

    list: boundQuery("customWidget.list")
      .meta(sourceProjectionMeta({ mcp: { enabled: true, description: "List all Custom JSX widgets." } }))
      .handler(async ({ context }) => {
        const [definitions, legacyDefinitions] = await Promise.all([
          context.db.query.customWidgetDefinitions.findMany({
            orderBy: (table, { asc }) => asc(table.name),
            with: { secrets: true },
          }),
          context.db.query.legacyCustomWidgetDefinitions.findMany({
            orderBy: (table, { asc }) => asc(table.name),
            with: { secrets: true },
          }),
        ]);
        const current = definitions.map(mapCustomWidgetListItem);
        const currentIds = new Set(definitions.map(({ id }) => id));
        const legacy = legacyDefinitions.filter(({ id }) => !currentIds.has(id)).map(mapLegacyCustomWidgetListItem);
        return [...current, ...legacy].toSorted((left, right) => left.name.localeCompare(right.name));
      }),
    legacyMigrationPrompt: boundQuery("customWidget.legacyMigrationPrompt")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get a redacted AI migration prompt for one preserved legacy Custom Widget. Credentials must be configured separately.",
          },
        }),
      )
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const definition = await context.db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, input.id),
          with: { secrets: true },
        });
        if (!definition) throw new ORPCError("NOT_FOUND", { message: "Legacy custom widget not found" });
        return {
          id: definition.id,
          managementPath: "/manage/custom-widgets",
          version: 1 as const,
          prompt: buildLegacyCustomWidgetMigrationPrompt(
            definition,
            definition.secrets.map(({ kind }) => kind),
          ),
        };
      }),
    get: boundQuery("customWidget.get")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Get one Custom JSX widget without secret values." },
        }),
      )
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const definition = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
          with: { secrets: true },
        });
        if (!definition) throw new ORPCError("NOT_FOUND", { message: "Custom widget definition not found" });
        return {
          id: definition.id,
          managementPath: `/manage/custom-widgets/edit/${definition.id}`,
          ...parseStoredCustomWidgetDefinition(definition),
          enabled: definition.enabled,
          createdAt: definition.createdAt,
          updatedAt: definition.updatedAt,
          secrets: definition.secrets.map((secret) => ({
            sourceId: secret.sourceId,
            kind: secret.kind,
            hasValue: true,
            updatedAt: secret.updatedAt,
          })),
        };
      }),
    available: boundQuery("customWidget.available")
      .input(z.object({ boardId: z.string(), currentId: z.string().optional() }))
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");
        const definitions = await context.db.query.customWidgetDefinitions.findMany({
          where: input.currentId
            ? or(eq(customWidgetDefinitions.enabled, true), eq(customWidgetDefinitions.id, input.currentId))
            : eq(customWidgetDefinitions.enabled, true),
          orderBy: (table, { asc }) => asc(table.name),
        });
        const available = definitions.flatMap(mapAvailableCustomWidget);
        if (!input.currentId || available.some(({ id }) => id === input.currentId)) return available;
        const legacy = await context.db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, input.currentId),
        });
        if (!legacy) return available;
        return [...available, mapLegacyAvailableCustomWidget(legacy)];
      }),
    optionRequest: boundQuery("customWidget.optionRequest")
      .input(
        z.object({
          boardId: z.string(),
          definitionId: z.string(),
          requestId: z.string(),
          params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
        }),
      )
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");
        const stored = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
          with: { secrets: true },
        });
        if (!stored || !stored.enabled) throw new ORPCError("NOT_FOUND", { message: "Custom widget not found" });
        const definition = parseStoredCustomWidgetDefinition(stored);
        const requestDefinition = definition.requests[input.requestId];
        if (requestDefinition?.kind !== "query")
          throw new ORPCError("NOT_FOUND", { message: "Option query not found" });
        const request = { id: input.requestId, ...requestDefinition };
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), request.permission);
        const source = definition.sources[request.source];
        if (!source) throw new ORPCError("NOT_FOUND", { message: "Option query source not found" });
        const release = await acquireCustomWidgetRequestLimit({
          category: "query",
          userId: context.principal.user.id,
          itemId: `configuration:${input.boardId}`,
          definitionId: input.definitionId,
        });
        try {
          const values = resolveOptionRequestValues(request, input.params);
          const connection = await resolveCustomWidgetSource(context, source, request, () =>
            stored.secrets
              .filter((secret) => secret.sourceId === request.source)
              .map((secret) => ({ kind: secret.kind, value: decryptSecret(secret.encryptedValue) })),
          );
          const response = await executeCustomWidgetRequest({
            ...connection,
            targetUrl: renderRequestTarget(connection.baseUrl, request, values),
            method: request.method,
            body: renderRequestBody(request, values),
            staticHeaders: request.headers,
            kind: "query",
            cacheKey: `custom-widget:options:${input.definitionId}:${getCustomWidgetCacheVersion(stored)}:${request.id}:${hashRuntimeParams(values)}:${connection.cacheVersion}`,
            cacheTtlSeconds: request.cacheSeconds ?? 30,
          });
          return {
            ok: response.ok,
            status: response.status,
            data: response.data,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          };
        } finally {
          await release();
        }
      }),

    create: boundMutation("customWidget.create")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Requires administrator permission. Create a Custom JSX widget without reusing a preview. Prefer customWidget_createFromPreview after full preview validation and query checks so the definition is not streamed again.",
          },
        }),
      )
      .input(customWidgetCreateSchema)
      .handler(async ({ context, input }) => {
        const { secrets, ...candidate } = input;
        const definition = parseCustomWidgetAuthoringInput(() => normalizeCustomWidgetAuthoringDefinition(candidate));
        await assertCustomWidgetIntegrationBindings(context, definition.sources);
        assertSecretSources(definition.sources, secrets);
        const id = await insertCustomWidgetDefinition(context.db, definition, context.principal.user.id, secrets);
        logger.info("Created custom widget definition", { id, name: definition.name });
        return getCreatedCustomWidgetResult(id);
      }),
    createFromPreview: boundMutation("customWidget.createFromPreview")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Requires administrator permission. Persist an exact tested new-widget preview from customWidget_previewCreate or customWidget_previewReviseTemplate. Edit previews must use customWidget_updateFromPreview. Every query and action in the final preview revision must have current evidence.",
          },
        }),
      )
      .input(
        z.object({
          previewSessionId: z.string().min(1),
          targetBoardId: z
            .string()
            .min(1)
            .nullish()
            .describe(
              "An existing board ID only when placement was requested. Omit or send null to save unplaced; never send labels or placeholders such as unplaced or none.",
            ),
        }),
      )
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.previewSessionId, context.principal.user.id);
        if (session.definitionId)
          throw new ORPCError("BAD_REQUEST", {
            message: "This edit preview must update its existing custom widget with customWidget_updateFromPreview",
          });
        const evidence = await getPreviewEvidence(session.id, context.principal.user.id);
        assertCurrentPreviewEvidence(session, evidence, "creating");
        const definition = parsePreviewDefinition(session);
        const secrets = getPersistedPreviewSecrets(session);
        await assertCustomWidgetIntegrationBindings(context, definition.sources);
        assertSecretSources(definition.sources, secrets);
        const id = await insertCustomWidgetDefinition(context.db, definition, context.principal.user.id, secrets);
        logger.info("Created custom widget definition from tested preview", {
          id,
          name: definition.name,
          previewSessionId: session.id,
        });
        return getCreatedCustomWidgetResult(id, input.targetBoardId ?? undefined);
      }),
    updateFromPreview: boundMutation("customWidget.updateFromPreview")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Requires administrator permission. Update the existing Custom JSX widget associated with an edit preview, using that exact tested preview revision without creating a duplicate. Every query and action in the final preview revision must have current evidence.",
          },
        }),
      )
      .input(z.object({ previewSessionId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.previewSessionId, context.principal.user.id);
        if (!session.definitionId)
          throw new ORPCError("BAD_REQUEST", {
            message: "This preview is not associated with an existing custom widget definition",
          });
        if (!session.definitionStateFingerprint)
          throw new ORPCError("CONFLICT", {
            message: "This edit preview predates safe update persistence. Create a new preview and retry.",
          });
        const evidence = await getPreviewEvidence(session.id, context.principal.user.id);
        assertCurrentPreviewEvidence(session, evidence, "updating");
        const definition = parsePreviewDefinition(session);
        const secrets = getPersistedPreviewSecrets(session);
        await assertCustomWidgetIntegrationBindings(context, definition.sources);
        assertSecretSources(definition.sources, secrets);
        await updateCustomWidgetDefinition(context.db, {
          id: session.definitionId,
          definition,
          secrets,
          expectedStateFingerprint: session.definitionStateFingerprint,
        });
        logger.info("Updated custom widget definition from tested preview", {
          id: session.definitionId,
          name: definition.name,
          previewSessionId: session.id,
        });
        return { id: session.definitionId, managementPath: `/manage/custom-widgets/edit/${session.definitionId}` };
      }),
    update: boundMutation("customWidget.update")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Update one Custom JSX widget. Prefer templateLines for multiline JSX changes. Returns a client-navigable edit link.",
          },
        }),
      )
      .input(customWidgetUpdateSchema)
      .handler(async ({ context, input }) => {
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!existing) throw new ORPCError("NOT_FOUND");
        const current = parseStoredCustomWidgetDefinition(existing);
        const { id, secrets, ...authoringChanges } = input;
        const definition = parseCustomWidgetAuthoringInput(() =>
          customWidgetDefinitionSchema.parse({ ...current, ...normalizeCustomWidgetAuthoringUpdate(authoringChanges) }),
        );
        await assertCustomWidgetIntegrationBindings(context, definition.sources);
        if (secrets) assertSecretSources(definition.sources, secrets);
        await updateCustomWidgetDefinition(context.db, { id, definition, secrets });
        logger.info("Updated custom widget definition", { id });
        return { id, managementPath: `/manage/custom-widgets/edit/${id}` };
      }),

    secretSet: boundMutation("customWidget.secretSet")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Set one encrypted secret for a custom widget source." },
        }),
      )
      .input(z.object({ definitionId: z.string(), secret: customWidgetSecretInputSchema }))
      .handler(async ({ context, input }) => {
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!existing) throw new ORPCError("NOT_FOUND");
        const definition = parseStoredCustomWidgetDefinition(existing);
        assertSecretSources(definition.sources, [input.secret]);
        await setCustomWidgetSecret(context.db, input.definitionId, input.secret);
        return { sourceId: input.secret.sourceId, kind: input.secret.kind, isSet: true };
      }),
    sourceConfigure: boundMutation("customWidget.sourceConfigure")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Configure one custom widget source. For an integration source, provide integrationId from integration_all (matching integrationKind); omit URL and secrets. Requires administrator permission.",
          },
        }),
      )
      .input(
        z.object({
          definitionId: z.string(),
          sourceId: z.string(),
          baseUrl: z.string().optional(),
          integrationId: z.string().min(1).max(100).optional(),
          networkScope: z.enum(["public", "private", "loopback"]).optional(),
          secrets: customWidgetSecretsInputSchema.default([]),
        }),
      )
      .handler(async ({ context, input }) => {
        const stored = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!stored) throw new ORPCError("NOT_FOUND");
        const definition = parseStoredCustomWidgetDefinition(stored);
        const current = definition.sources[input.sourceId];
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Widget source not found" });
        let configuration: unknown;
        if (current.type === "integration") {
          if (
            !input.integrationId ||
            input.baseUrl !== undefined ||
            input.networkScope !== undefined ||
            input.secrets.length > 0
          )
            throw new ORPCError("BAD_REQUEST", { message: "Integration sources require only an integrationId" });
          configuration = { ...current, integrationId: input.integrationId };
        } else {
          if (input.integrationId)
            throw new ORPCError("BAD_REQUEST", { message: "HTTP sources cannot bind an integration" });
          configuration = {
            ...current,
            baseUrl: input.baseUrl,
            networkScope: input.networkScope ?? current.networkScope,
          };
        }
        const source = customWidgetSourceSchema.parse(configuration);
        await assertCustomWidgetIntegrationBindings(context, { [input.sourceId]: source });
        assertSecretSources({ [input.sourceId]: source }, input.secrets);
        const configuredSource = await configureCustomWidgetSource(context.db, { ...input, expectedSource: current });
        return {
          definitionId: input.definitionId,
          sourceId: input.sourceId,
          integrationId: configuredSource.integrationId,
          baseUrl: configuredSource.baseUrl,
          networkScope: configuredSource.networkScope,
          configuredSecrets: input.secrets.map(({ kind }) => kind),
        };
      }),
    configurationRequestUser: boundMutation("customWidget.configurationRequestUser")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Create or check a short-lived source-configuration request for the current administrator. Create with {previewSessionId,sourceId} or {definitionId,sourceId}; check status with {requestId} only. Never combine these modes or include secret values. Share the returned URL for the user to configure credentials.",
          },
        }),
      )
      .input(secretRequestInputSchema)
      .handler(async ({ context, input }) => {
        if (input.requestId) {
          const request = await getCustomWidgetConfigurationRequestForUser(input.requestId, context.principal.user.id);
          if (!request) throw new ORPCError("NOT_FOUND");
          return {
            requestId: request.id,
            status: request.status,
            expiresAt: request.expiresAt,
            sourceId: request.sourceId,
            ...(request.target.type === "preview" ? { previewSessionId: request.target.id } : {}),
          };
        }
        let widgetName: string;
        let source:
          | { id: string; name: string; auth: CustomWidgetSource["auth"]; value: CustomWidgetSource }
          | undefined;
        let target: { type: "definition"; id: string } | { type: "preview"; id: string };
        if (input.definitionId) {
          const stored = await context.db.query.customWidgetDefinitions.findFirst({
            where: eq(customWidgetDefinitions.id, input.definitionId),
          });
          if (!stored) throw new ORPCError("NOT_FOUND");
          const definition = parseStoredCustomWidgetDefinition(stored);
          widgetName = definition.name;
          const candidate = definition.sources[input.sourceId ?? ""];
          source = candidate
            ? {
                id: input.sourceId ?? "",
                name: candidate.name ?? input.sourceId ?? "",
                auth: candidate.auth,
                value: candidate,
              }
            : undefined;
          target = { type: "definition", id: input.definitionId };
        } else {
          const preview = await getPreviewSession(input.previewSessionId ?? "", context.principal.user.id);
          widgetName = preview.name;
          const candidate = preview.sources[input.sourceId ?? ""];
          source = candidate
            ? {
                id: input.sourceId ?? "",
                name: candidate.name ?? input.sourceId ?? "",
                auth: candidate.auth,
                value: candidate,
              }
            : undefined;
          target = { type: "preview", id: preview.id };
        }
        if (!source) throw new ORPCError("NOT_FOUND", { message: "Widget source not found" });
        const kinds = [...requiredSecretKinds(getCustomWidgetSourceAuthType(source))];
        const request = await createCustomWidgetConfigurationRequest({
          userId: context.principal.user.id,
          target,
          widgetName,
          sourceId: source.id,
          sourceName: source.name,
          source: source.value,
          kinds,
        });
        return {
          requestId: request.id,
          status: request.status,
          expiresAt: request.expiresAt,
          sourceId: request.sourceId,
          ...(request.target.type === "preview" ? { previewSessionId: request.target.id } : {}),
          url: new URL(`/custom-widget-configuration/${request.id}`, context.baseUrl ?? "http://localhost").toString(),
        };
      }),
    secretClear: boundMutation("customWidget.secretClear")
      .input(
        z.object({ definitionId: z.string(), sourceId: z.string(), kind: z.enum(["apiKey", "username", "password"]) }),
      )
      .handler(async ({ context, input }) => {
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!existing) throw new ORPCError("NOT_FOUND");
        await clearCustomWidgetSecret(context.db, input);
        return { sourceId: input.sourceId, kind: input.kind, isSet: false };
      }),

    workshopSearch: boundQuery("customWidget.workshopSearch")
      .meta(sourceProjectionMeta({ mcp: { enabled: true, description: "Search Workshop for Custom JSX widgets." } }))
      .input(workshopSearchInputSchema)
      .handler(async ({ input }) => {
        try {
          const result = await workshop.list({
            page: 1,
            perPage: input.limit,
            search: input.query,
            sort: input.sort,
            type: "customWidget",
            includeOutdated: true,
          });
          return {
            items: result.items
              .filter((item) => item.widgetSchema === CUSTOM_WIDGET_SCHEMA)
              .map((item) => ({
                id: item.id,
                url: getWorkshopSubmissionUrl(item.id),
                title: item.title,
                description: item.description,
                authorName: item.authorName,
                score: item.score,
                revision: item.revision,
                outdated: item.outdated,
                reportCount: item.reportCount,
              })),
          };
        } catch {
          throwWorkshopUnavailable("Workshop widget search failed", "workshop_widget_search_failed");
        }
      }),
    workshopGet: boundQuery("customWidget.workshopGet")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Get and validate one Workshop Custom JSX widget." },
        }),
      )
      .input(z.object({ submissionId: z.string().min(1) }))
      .handler(async ({ input }) => {
        const { submission, widget } = await getWorkshopWidget(input.submissionId);
        return {
          submission: {
            id: submission.id,
            url: getWorkshopSubmissionUrl(submission.id),
            title: submission.title,
            description: submission.description,
            authorName: submission.authorName,
            revision: submission.revision,
            score: submission.score,
            outdated: submission.outdated,
            reportCount: submission.reportCount,
          },
          widget,
          sourceSetup: getCustomWidgetSourceSetups(widget.sources),
          hasActions: Object.values(widget.requests).some((request) => request.kind === "action"),
          methods: [...new Set(Object.values(widget.requests).map((request) => request.method))],
          permissions: [...new Set(Object.values(widget.requests).map((request) => request.permission))],
        };
      }),
    workshopInstall: boundMutation("customWidget.workshopInstall")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Install one validated Workshop Custom JSX widget." },
        }),
      )
      .input(
        z.object({
          submissionId: z.string().min(1),
          name: z.string().trim().min(1).max(128).optional(),
          sources: sourceOverridesSchema.default({}),
          secrets: customWidgetSecretsInputSchema.default([]),
        }),
      )
      .handler(async ({ context, input }) => {
        const { widget } = await getWorkshopWidget(input.submissionId);
        const unknownSource = Object.keys(input.sources).find((sourceId) => !widget.sources[sourceId]);
        if (unknownSource)
          throw new ORPCError("BAD_REQUEST", { message: `Unknown Workshop widget source '${unknownSource}'` });
        const configured = customWidgetDefinitionSchema.parse({
          ...widget,
          name: input.name ?? widget.name,
          sources: applyCustomWidgetSourceSetup(
            widget.sources,
            Object.fromEntries(
              Object.entries(input.sources).map(([sourceId, source]) => [
                sourceId,
                {
                  baseUrl: source.baseUrl,
                  integrationId: source.integrationId,
                  networkScope: source.networkScope ?? widget.sources[sourceId]?.networkScope ?? "public",
                },
              ]),
            ),
          ),
        });
        await assertCustomWidgetIntegrationBindings(context, configured.sources);
        assertSecretSources(configured.sources, input.secrets);
        const id = await insertCustomWidgetDefinition(context.db, configured, context.principal.user.id, input.secrets);
        const configuredSecrets = new Set(input.secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
        return {
          status: "installed" as const,
          definitionId: id,
          sourceSetup: getCustomWidgetSourceSetups(configured.sources, input.secrets),
          missingCredentials: getCustomWidgetSecretRequirements(configured.sources)
            .filter((requirement) => !configuredSecrets.has(`${requirement.sourceId}:${requirement.kind}`))
            .map(({ sourceId, kind }) => ({ sourceId, kind })),
        };
      }),

    toggleEnabled: boundMutation("customWidget.toggleEnabled")
      .input(z.object({ id: z.string(), enabled: z.boolean() }))
      .handler(async ({ context, input }) => {
        if (input.enabled) {
          const definition = await context.db.query.customWidgetDefinitions.findFirst({
            where: eq(customWidgetDefinitions.id, input.id),
          });
          if (!definition) throw new ORPCError("NOT_FOUND");
          if (!safeParseStoredCustomWidgetDefinition(definition).success)
            throw new ORPCError("BAD_REQUEST", { message: "Invalid custom widget definition cannot be enabled" });
        }
        await context.db
          .update(customWidgetDefinitions)
          .set({ enabled: input.enabled, updatedAt: new Date() })
          .where(eq(customWidgetDefinitions.id, input.id));
      }),
    delete: boundMutation("customWidget.delete")
      .meta(sourceProjectionMeta({ mcp: { enabled: true, description: "Delete one Custom JSX widget." } }))
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        await context.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
        logger.info("Deleted custom widget definition", { id: input.id });
      }),
    duplicate: boundMutation("customWidget.duplicate")
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!existing) throw new ORPCError("NOT_FOUND");
        const current = parseStoredCustomWidgetDefinition(existing);
        const id = createId();
        await context.db.insert(customWidgetDefinitions).values({
          id,
          ...serializeCustomWidgetDefinition({ ...current, name: `${current.name} (copy)` }),
          creatorId: context.principal.user.id,
        });
        return { id, name: `${current.name} (copy)` };
      }),
    readTemplate: boundQuery("customWidget.readTemplate")
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const definition = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!definition) throw new ORPCError("NOT_FOUND", { message: "Custom widget definition not found" });
        const template = parseStoredCustomWidgetDefinition(definition).template;
        return {
          id: definition.id,
          name: definition.name,
          template,
          templateLines: template.split("\n"),
          revision: getTemplateRevision(template),
        };
      }),
    writeTemplate: boundMutation("customWidget.writeTemplate")
      .input(
        z
          .object({ id: z.string(), template: z.string().optional(), templateLines: z.array(z.string()).optional() })
          .refine((data) => data.template !== undefined || data.templateLines !== undefined, {
            message: "Provide either template or templateLines",
          })
          .refine((data) => !(data.template !== undefined && data.templateLines !== undefined), {
            message: "Provide template or templateLines, not both",
          }),
      )
      .handler(async ({ context, input }) => {
        const resolved = input.templateLines?.join("\n") ?? input.template ?? "";
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!existing) throw new ORPCError("NOT_FOUND", { message: "Custom widget definition not found" });
        const template = validateTemplate(parseStoredCustomWidgetDefinition(existing), resolved);
        await context.db
          .update(customWidgetDefinitions)
          .set({ template, updatedAt: new Date() })
          .where(eq(customWidgetDefinitions.id, input.id));
        logger.info("Updated custom widget template", { id: input.id });
        return { id: input.id, template, templateLines: template.split("\n"), revision: getTemplateRevision(template) };
      }),
    templatePatch: boundMutation("customWidget.templatePatch")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Patch selected JSX template lines using an optimistic revision." },
        }),
      )
      .input(
        z.object({
          id: z.string(),
          expectedRevision: z.string().length(16),
          edits: z
            .array(
              z.object({
                startLine: z.number().int().min(1),
                deleteCount: z.number().int().min(0),
                replacementLines: z.array(z.string()),
              }),
            )
            .min(1)
            .max(100),
        }),
      )
      .handler(async ({ context, input }) => {
        const existing = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!existing) throw new ORPCError("NOT_FOUND", { message: "Custom widget definition not found" });
        const definition = parseStoredCustomWidgetDefinition(existing);
        if (getTemplateRevision(definition.template) !== input.expectedRevision)
          throw new ORPCError("CONFLICT", { message: "Template changed since it was read. Read it again and retry." });
        const lines = definition.template.split("\n");
        const edits = input.edits.toSorted((left, right) => right.startLine - left.startLine);
        let nextHigherStart = lines.length + 2;
        for (const edit of edits) {
          if (edit.startLine > lines.length + 1 || edit.startLine + edit.deleteCount - 1 > lines.length)
            throw new ORPCError("BAD_REQUEST", { message: `Edit at line ${edit.startLine} is out of range` });
          if (edit.startLine + Math.max(edit.deleteCount, 1) > nextHigherStart)
            throw new ORPCError("BAD_REQUEST", { message: "Template patch edits must not overlap" });
          nextHigherStart = edit.startLine;
          lines.splice(edit.startLine - 1, edit.deleteCount, ...edit.replacementLines);
        }
        const template = validateTemplate(definition, lines.join("\n"));
        const result: unknown = await context.db
          .update(customWidgetDefinitions)
          .set({ template, updatedAt: new Date() })
          .where(
            and(eq(customWidgetDefinitions.id, input.id), eq(customWidgetDefinitions.template, definition.template)),
          );
        if (getAffectedRowCount(result) === 0)
          throw new ORPCError("CONFLICT", { message: "Template changed since it was read. Read it again and retry." });
        logger.info("Patched custom widget template", { id: input.id, editCount: input.edits.length });
        return { id: input.id, template, templateLines: lines, revision: getTemplateRevision(template) };
      }),

    export: boundQuery("customWidget.export")
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const definition = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!definition) throw new ORPCError("NOT_FOUND");
        return exportCustomWidgetDefinition(parseStoredCustomWidgetDefinition(definition));
      }),
    exportLegacy: boundQuery("customWidget.exportLegacy")
      .input(z.object({ id: z.string() }))
      .handler(async ({ context, input }) => {
        const definition = await context.db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, input.id),
          with: { secrets: true },
        });
        if (!definition) throw new ORPCError("NOT_FOUND", { message: "Legacy custom widget not found" });
        return {
          $schema: "homarr-custom-widget-v1" as const,
          name: definition.name,
          description: definition.description,
          iconUrl: definition.iconUrl,
          url: definition.url,
          authType: definition.authType,
          headerName: definition.headerName,
          method: definition.method,
          requestBody: definition.requestBody,
          displayType: definition.displayType,
          displayConfig: parseLegacyDisplayConfig(definition.displayConfig),
          configuredSecretKinds: definition.secrets.map(({ kind }) => kind),
        };
      }),
    import: boundMutation("customWidget.import")
      .input(z.object({ widget: customWidgetImportSchema, secrets: customWidgetSecretsInputSchema.default([]) }))
      .handler(async ({ context, input }) => {
        await assertCustomWidgetIntegrationBindings(context, input.widget.sources);
        assertSecretSources(input.widget.sources, input.secrets);
        const id = await insertCustomWidgetDefinition(
          context.db,
          input.widget,
          context.principal.user.id,
          input.secrets,
        );
        logger.info("Imported custom widget definition", { id, name: input.widget.name });
        return { id };
      }),
    migrateLegacy: boundMutation("customWidget.migrateLegacy")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Replace one preserved legacy Custom Widget with a validated v2 definition while retaining compatible encrypted credentials.",
          },
        }),
      )
      .input(
        z.object({
          id: z.string(),
          widget: customWidgetImportSchema,
          secrets: customWidgetSecretsInputSchema.default([]),
        }),
      )
      .handler(async ({ context, input }) => {
        await assertCustomWidgetIntegrationBindings(context, input.widget.sources);
        assertSecretSources(input.widget.sources, input.secrets);
        const [legacy, current] = await Promise.all([
          context.db.query.legacyCustomWidgetDefinitions.findFirst({
            where: eq(legacyCustomWidgetDefinitions.id, input.id),
            with: { secrets: true },
          }),
          context.db.query.customWidgetDefinitions.findFirst({ where: eq(customWidgetDefinitions.id, input.id) }),
        ]);
        if (!legacy) throw new ORPCError("NOT_FOUND", { message: "Legacy custom widget not found" });
        if (current) throw new ORPCError("CONFLICT", { message: "A v2 widget already uses this identifier" });
        const explicitKeys = new Set(input.secrets.map(({ sourceId, kind }) => `${sourceId}:${kind}`));
        const auth = input.widget.sources.default?.auth;
        const authType = typeof auth === "string" ? auth : (auth?.type ?? "none");
        const preservableKinds = new Set<string>(requiredSecretKinds(authType));
        const preservedSecrets = canPreserveLegacySecrets(legacy, input.widget)
          ? legacy.secrets.filter(({ kind }) => preservableKinds.has(kind) && !explicitKeys.has(`default:${kind}`))
          : [];
        const now = new Date();
        const definitionRow = {
          id: legacy.id,
          ...serializeCustomWidgetDefinition(input.widget),
          enabled: legacy.enabled,
          createdAt: legacy.createdAt,
          updatedAt: now,
          creatorId: legacy.creatorId,
        };
        const secretRows = [
          ...preservedSecrets.map(({ kind, encryptedValue }) => ({
            definitionId: legacy.id,
            sourceId: "default",
            kind,
            encryptedValue,
            updatedAt: now,
          })),
          ...input.secrets.map(({ sourceId, kind, value }) => ({
            definitionId: legacy.id,
            sourceId,
            kind,
            encryptedValue: encryptSecret(value),
            updatedAt: now,
          })),
        ];
        await handleTransactionsAsync(context.db, {
          async handleAsync(database, schema) {
            await database.transaction(async (transaction) => {
              await transaction.insert(schema.customWidgetDefinitions).values(definitionRow);
              if (secretRows.length > 0) await transaction.insert(schema.customWidgetSecrets).values(secretRows);
            });
          },
          handleSync(database) {
            database.transaction((transaction) => {
              transaction.insert(customWidgetDefinitions).values(definitionRow).run();
              if (secretRows.length > 0) transaction.insert(customWidgetSecrets).values(secretRows).run();
            });
          },
        });
        logger.info("Created v2 replacement for preserved legacy custom widget definition", {
          id: legacy.id,
          preservedSecretCount: preservedSecrets.length,
        });
        return { id: legacy.id, preservedSecretCount: preservedSecrets.length };
      }),

    previewCreate: boundMutation("customWidget.previewCreate")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Fully validate a complete Custom JSX definition and create a short-lived preview in one call. Pass definition directly as an object, never serialized JSON. Prefer templateLines for multiline JSX. The result lists every query and action that needs evidence before saving.",
          },
        }),
      )
      .input(previewCreateInputSchema)
      .handler(async ({ context, input }) => {
        const definition = parseCustomWidgetAuthoringInput(() =>
          normalizeCustomWidgetAuthoringDefinition(input.definition),
        );
        await assertCustomWidgetIntegrationBindings(context, definition.sources);
        const options = input.options ?? getCustomWidgetDefaultOptions(definition.options);
        const optionIssues = validateCustomWidgetOptions(definition.options, options);
        if (optionIssues.length > 0) {
          const issue = optionIssues[0];
          throw new ORPCError("BAD_REQUEST", {
            message: issue ? `${issue.path}: ${issue.message}` : "Preview options are invalid",
          });
        }
        const secrets = [...input.secrets];
        let definitionStateFingerprint: string | undefined;
        let persistenceTool: "customWidget_createFromPreview" | "customWidget_updateFromPreview" =
          "customWidget_createFromPreview";
        if (input.definitionId) {
          const existing = await context.db.query.customWidgetDefinitions.findFirst({
            where: eq(customWidgetDefinitions.id, input.definitionId),
            with: { secrets: true },
          });
          if (!existing) throw new ORPCError("NOT_FOUND", { message: "Custom widget definition not found" });
          definitionStateFingerprint = getCustomWidgetDefinitionStateFingerprint(existing, existing.secrets);
          persistenceTool = "customWidget_updateFromPreview";
          const existingDefinition = parseStoredCustomWidgetDefinition(existing);
          for (const [sourceId, existingSource] of Object.entries(existingDefinition.sources)) {
            const submittedSource = definition.sources[sourceId];
            const hasStoredSecrets = existing.secrets.some((secret) => secret.sourceId === sourceId);
            if (!submittedSource || !hasStoredSecrets || hasSameSecretBinding(existingSource, submittedSource))
              continue;
            const missing = requiredSecretKinds(getCustomWidgetSourceAuthType(submittedSource)).some(
              (kind) => !secrets.some((secret) => secret.sourceId === sourceId && secret.kind === kind),
            );
            if (missing)
              throw new ORPCError("BAD_REQUEST", {
                message: "Source security settings changed; re-enter its credentials to preview this definition",
              });
          }
          for (const secret of existing.secrets) {
            const existingSource = existingDefinition.sources[secret.sourceId];
            const submittedSource = definition.sources[secret.sourceId];
            if (
              existingSource &&
              submittedSource &&
              hasSameSecretBinding(existingSource, submittedSource) &&
              !secrets.some((candidate) => candidate.sourceId === secret.sourceId && candidate.kind === secret.kind)
            )
              secrets.push({
                sourceId: secret.sourceId,
                kind: secret.kind,
                value: decryptSecret(secret.encryptedValue),
              });
          }
        }
        const invalid = secrets.find((secret) => {
          const source = definition.sources[secret.sourceId];
          const authType = getCustomWidgetSourceAuthType(source);
          const kinds =
            authType === "basic"
              ? ["username", "password"]
              : source && authType && ["bearer", "apiKeyHeader", "apiKeyQuery"].includes(authType)
                ? ["apiKey"]
                : [];
          return !source || !kinds.includes(secret.kind);
        });
        if (invalid) throw new ORPCError("BAD_REQUEST", { message: `Unknown secret source '${invalid.sourceId}'` });
        const previewSession = await createPreviewSession({
          userId: context.principal.user.id,
          sources: definition.sources,
          requests: definition.requests,
          name: definition.name,
          description: definition.description,
          iconUrl: definition.iconUrl,
          template: definition.template,
          optionDefinitions: definition.options,
          options,
          secrets,
          definitionId: input.definitionId,
          definitionStateFingerprint,
        });
        const previewPath = `/manage/custom-widgets/preview/${previewSession.id}`;
        return {
          success: true as const,
          previewSession: {
            id: previewSession.id,
            revision: previewSession.revision,
            expiresAt: previewSession.expiresAt,
            liveActions: previewSession.liveActions,
          },
          previewPath,
          previewUrl: new URL(previewPath, context.baseUrl ?? "http://localhost").toString(),
          persistenceTool,
          sourceConfigurations: getRequiredSourceConfigurations(
            definition.sources,
            definition.requests,
            secrets,
            previewSession.id,
          ),
          ...getPreviewEvidenceChecklist(definition.requests, previewSession.id),
        };
      }),
    previewReviseTemplate: boundMutation("customWidget.previewReviseTemplate")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Replace only the JSX template in an existing preview after a response-driven correction. The inherited sources, requests, options, and secrets are fully revalidated without resending them. Prior evidence becomes stale, so rerun every returned query and action before persistence.",
          },
        }),
      )
      .input(previewReviseTemplateInputSchema)
      .handler(async ({ context, input }) => {
        const template = input.template ?? input.templateLines?.join("\n");
        if (template === undefined)
          throw new ORPCError("BAD_REQUEST", { message: "Provide template or templateLines" });
        const revised = await revisePreviewSessionTemplate(
          input.sessionId,
          context.principal.user.id,
          template,
          input.expectedRevision,
        );
        const session = await getPreviewSession(revised.id, context.principal.user.id);
        let persistenceTool: "customWidget_createFromPreview" | "customWidget_updateFromPreview" =
          "customWidget_createFromPreview";
        if (session.definitionId) persistenceTool = "customWidget_updateFromPreview";
        const previewPath = `/manage/custom-widgets/preview/${session.id}`;
        return {
          success: true as const,
          evidenceReset: true as const,
          previewSession: {
            id: session.id,
            revision: session.revision,
            expiresAt: session.expiresAt,
            liveActions: session.liveActions,
          },
          previewPath,
          previewUrl: new URL(previewPath, context.baseUrl ?? "http://localhost").toString(),
          persistenceTool,
          ...getPreviewEvidenceChecklist(session.requests, session.id),
        };
      }),
    previewGet: boundQuery("customWidget.previewGet")
      .input(z.object({ sessionId: z.string() }))
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.sessionId, context.principal.user.id);
        return {
          id: session.id,
          revision: session.revision,
          name: session.name,
          description: session.description,
          iconUrl: session.iconUrl,
          expiresAt: session.expiresAt,
          template: session.template,
          optionDefinitions: session.optionDefinitions,
          options: session.options,
          requests: Object.entries(session.requests).map(([id, request]) => ({
            id,
            kind: request.kind,
            method: request.method,
            minimumBoardPermission: request.permission,
            trigger: request.trigger,
            confirmation: getCustomWidgetConfirmation(request),
            invalidates: request.invalidates,
          })),
          liveActions: session.liveActions,
        };
      }),
    previewRefresh: boundMutation("customWidget.previewRefresh")
      .input(
        z.object({ sessionId: z.string().min(1), requestIds: z.array(z.string().min(1).max(128)).max(128).optional() }),
      )
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.sessionId, context.principal.user.id);
        if (input.requestIds) {
          const prefixes = input.requestIds
            .filter((id) => Object.hasOwn(session.requests, id))
            .map((id) => `custom-jsx:preview:${session.id}:${id}:`);
          invalidateCustomWidgetResponseCache(prefixes);
          return;
        }
        invalidateCustomWidgetResponseCache([`custom-jsx:preview:${session.id}:`]);
      }),
    previewQuery: boundQuery("customWidget.previewQuery")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Execute one real API query from a preview evidence list and return its HTTP status plus parsed data so request paths and template bindings can be verified. Call once for every query in the current preview revision before createFromPreview or updateFromPreview persistence.",
          },
        }),
      )
      .input(previewSessionRequestSchema)
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.sessionId, context.principal.user.id);
        const definition = session.requests[input.requestId];
        if (definition?.kind !== "query") throw new ORPCError("NOT_FOUND", { message: "Preview query was not found" });
        const request = { id: input.requestId, ...definition };
        const failure = getPreviewRequestSourceConfigurationFailure(session, request);
        if (failure) return failure;
        const params = resolveCustomWidgetRequestValues(request, session.options, input.params);
        const body = renderRequestBody(request, params);
        const release = await acquireCustomWidgetRequestLimit({
          category: "query",
          userId: context.principal.user.id,
          itemId: `preview:${session.id}`,
          definitionId: session.definitionId ?? `preview:${session.id}`,
        });
        const startedAt = Date.now();
        try {
          const resolved = await getPreviewRequestSource(context, session, request);
          if (!resolved) throw new ORPCError("NOT_FOUND", { message: "Preview source was not found" });
          const targetUrl = renderRequestTarget(resolved.baseUrl, request, params);
          const response = await executeCustomWidgetRequest({
            ...resolved,
            targetUrl,
            method: request.method,
            body,
            staticHeaders: request.headers,
            auth: request.auth === "none" ? undefined : resolved.auth,
            kind: "query",
            cacheKey: `custom-jsx:preview:${session.id}:${request.id}:${hashRuntimeParams(params)}:${resolved.cacheVersion}`,
            cacheTtlSeconds: request.cacheSeconds,
          });
          await recordPreviewJournal(session, {
            requestId: request.id,
            kind: "query",
            method: request.method,
            path: request.path,
            status: response.status,
            durationMs: Date.now() - startedAt,
            simulated: false,
          });
          return {
            sessionId: session.id,
            requestId: request.id,
            sourceId: request.source,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          };
        } finally {
          await release();
        }
      }),
    setPreviewLiveActions: boundMutation("customWidget.setPreviewLiveActions")
      .input(z.object({ sessionId: z.string().min(1), enabled: z.boolean() }))
      .handler(async ({ context, input }) =>
        setPreviewSessionLiveActions(input.sessionId, context.principal.user.id, input.enabled),
      ),
    previewJournal: boundQuery("customWidget.previewJournal")
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "Read the redacted request journal for a custom widget preview session." },
        }),
      )
      .input(z.object({ sessionId: z.string().min(1) }))
      .handler(async ({ context, input }) => getPreviewJournal(input.sessionId, context.principal.user.id)),
    previewAction: boundMutation("customWidget.previewAction")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Test one action from the current preview revision. Supply its required params and keep preview actions simulated unless the user explicitly enabled live actions. Verify confirmation, permission, and invalidation metadata before createFromPreview or updateFromPreview persistence.",
          },
        }),
      )
      .input(previewSessionRequestSchema.extend({ confirmed: z.boolean().optional() }))
      .handler(async ({ context, input }) => {
        const session = await getPreviewSession(input.sessionId, context.principal.user.id);
        const definition = session.requests[input.requestId];
        if (definition?.kind !== "action")
          throw new ORPCError("NOT_FOUND", { message: "Preview action was not found" });
        const request = { id: input.requestId, ...definition };
        const failure = getPreviewRequestSourceConfigurationFailure(session, request);
        if (failure) return { ...failure, simulated: false as const };
        const params = resolveCustomWidgetRequestValues(request, session.options, input.params);
        const body = renderRequestBody(request, params);
        if (!session.liveActions) {
          const resolved = await getPreviewRequestSource(context, session, request);
          if (!resolved) throw new ORPCError("NOT_FOUND", { message: "Preview source was not found" });
          renderRequestTarget(resolved.baseUrl, request, params);
          await recordPreviewJournal(session, {
            requestId: request.id,
            kind: "action",
            method: request.method,
            path: request.path,
            status: null,
            durationMs: 0,
            simulated: true,
          });
          return {
            sessionId: session.id,
            requestId: request.id,
            sourceId: request.source,
            ok: true,
            status: 0,
            statusText: "Simulated",
            data: null,
            simulated: true as const,
          };
        }
        if ((request.confirmation || request.method === "DELETE") && input.confirmed !== true)
          throw new ORPCError("PRECONDITION_FAILED", { message: "This action requires confirmation" });
        const release = await acquireCustomWidgetRequestLimit({
          category: request.method === "DELETE" ? "delete" : "action",
          userId: context.principal.user.id,
          itemId: `preview:${session.id}`,
          definitionId: session.definitionId ?? `preview:${session.id}`,
        });
        const startedAt = Date.now();
        try {
          const resolved = await getPreviewRequestSource(context, session, request);
          if (!resolved) throw new ORPCError("NOT_FOUND", { message: "Preview source was not found" });
          const targetUrl = renderRequestTarget(resolved.baseUrl, request, params);
          const response = await executeCustomWidgetRequest({
            ...resolved,
            targetUrl,
            method: request.method,
            body,
            staticHeaders: request.headers,
            auth: request.auth === "none" ? undefined : resolved.auth,
            kind: "action",
          });
          if (response.ok && request.invalidates?.length)
            invalidateCustomWidgetResponseCache(
              request.invalidates.map((requestId) => `custom-jsx:preview:${session.id}:${requestId}:`),
            );
          await recordPreviewJournal(session, {
            requestId: request.id,
            kind: "action",
            method: request.method,
            path: request.path,
            status: response.status,
            durationMs: Date.now() - startedAt,
            simulated: false,
          });
          return {
            sessionId: session.id,
            requestId: request.id,
            sourceId: request.source,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
            simulated: false as const,
          };
        } finally {
          await release();
        }
      }),
  };
}
