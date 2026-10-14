import type { InferClientInputs, InferClientOutputs } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { RouterUtils } from "@orpc/tanstack-query";
import type { ChangeEventHandler, ComponentType, ReactNode } from "react";
import type { WidgetDefinition } from "@homarr/widgets/definition";
import type { reduceWidgetOptionsWithDefinition, WidgetDefinitionManifest } from "@homarr/widgets/definition-manifest";
import type { useForm } from "@homarr/widgets/inputs/form";
import type { CapturedStaticWidgetInputOwner } from "@homarr/widgets/inputs/static";

import type { createWidgetProcedures } from "../../../../../packages/api/src/nitro/routers/widgets";
import type { createCustomWidgetProcedures } from "../../../../../packages/api/src/nitro/routers/custom-widget";
import type { createBoardMutationProcedures } from "../../../../../packages/api/src/nitro/routers/board-mutations";
import type { createIntegrationManagementProcedures } from "../../../../../packages/api/src/nitro/routers/integration";
import type * as widgetOptions from "../../../../../packages/widgets/src/options";
import type * as widgetDefinitions from "../../../../../packages/definitions/src/widget";
import type * as integrationDefinitions from "../../../../../packages/definitions/src/integration";
import type * as releaseDefinitions from "../../../../../packages/definitions/src/release-provider";
import type * as optionTranslation from "../../../../../packages/widgets/src/option-translation";
import type { createId } from "../../../../../packages/common/src/id";
import type * as customCore from "../../../../../packages/custom-widgets/src/core";
import type * as workbench from "../../../../../packages/custom-widgets/src/workbench/form-schema";
import type * as boardValidation from "../../../../../packages/validation/src/board";
import type * as sharedValidation from "../../../../../packages/validation/src/shared";
import type { IntegrationSelectOption } from "../../../../../packages/widgets/src/widget-integration-select";
import type { CustomWidgetCodeEditor } from "../../../../../packages/custom-widgets/src/workbench/code-editor";
import type { CustomJsxRenderer } from "../../../../../packages/custom-widgets/src/runtime/custom-jsx-renderer";

export type { WidgetDefinition };

export type WidgetEditorClient = RouterClient<{
  widget: ReturnType<typeof createWidgetProcedures>;
  customWidget: ReturnType<typeof createCustomWidgetProcedures>;
  integration: ReturnType<typeof createIntegrationManagementProcedures>;
}>;
export type BoardEditorClient = RouterClient<ReturnType<typeof createBoardMutationProcedures>>;
export type WidgetEditorQueryUtils = RouterUtils<WidgetEditorClient>;
export type EditorInputs = InferClientInputs<WidgetEditorClient>;
export type EditorOutputs = InferClientOutputs<WidgetEditorClient>;
export type BoardInputs = InferClientInputs<BoardEditorClient>;
export type BoardDraft = BoardInputs["saveBoard"];
export type BoardDraftItem = BoardDraft["items"][number];
export type WidgetKind = BoardDraftItem["kind"];
export type EditorForm = ReturnType<typeof useForm>;
export type EditorState = ReturnType<EditorForm["getValues"]>;
export type EditorSize = { width: number; height: number };
export type EditorSettings = Parameters<WidgetDefinition["createOptions"]>[0];
export type EditorIntegration = IntegrationSelectOption;
export type WidgetEditorChangeOwner = CapturedStaticWidgetInputOwner;

export interface WidgetEditorOwnership {
  isCurrentOwner(): boolean;
  captureChangeOwner(): WidgetEditorChangeOwner;
}

export type EditorOption = widgetOptions.WidgetOptionDefinition & {
  shouldHide?: (options: Record<string, unknown>, kinds: EditorIntegration["kind"][]) => boolean;
};
export type EditorStaticOption = Extract<
  EditorOption,
  {
    type:
      | "internal"
      | "text"
      | "switch"
      | "number"
      | "slider"
      | "select"
      | "multiSelect"
      | "multiText"
      | "timezoneList"
      | "dateTimeEventList";
  }
>;
export type CustomDefinition = customCore.HomarrCustomWidgetV2;
export type CustomFormValues = workbench.CustomWidgetFormValues;
export type PreviewCreated = EditorOutputs["customWidget"]["previewCreate"];

export interface WidgetEditorDomain {
  widgetKinds: typeof widgetDefinitions.widgetKinds;
  widgetDefaultSizes: typeof widgetDefinitions.widgetDefaultSizes;
  loadWidgetDefinition: WidgetDefinitionManifest["loadWidgetDefinition"];
  reduceWidgetOptionsWithDefinition: typeof reduceWidgetOptionsWithDefinition;
  optionsSuperRefine: typeof widgetOptions.OPTIONS_SUPER_REFINE;
  itemAdvancedOptionsSchema: typeof sharedValidation.itemAdvancedOptionsSchema;
  boardSaveSchema: typeof boardValidation.boardSaveSchema;
  boardSaveLayoutsSchema: typeof boardValidation.boardSaveLayoutsSchema;
  releaseProviderKinds: typeof releaseDefinitions.releaseProviderKinds;
  getReleaseProviderName: typeof releaseDefinitions.getReleaseProviderName;
  getReleaseProviderDefaultUrl: typeof releaseDefinitions.getReleaseProviderDefaultUrl;
  getIconUrl: typeof integrationDefinitions.getIconUrl;
  createId: typeof createId;
  getWidgetOptionTranslationNamespace: typeof optionTranslation.getWidgetOptionTranslationNamespace;
  getWidgetOptionDescriptionTranslationNamespace: typeof optionTranslation.getWidgetOptionDescriptionTranslationNamespace;
  customWidgetDefinitionSchema: typeof customCore.customWidgetDefinitionSchema;
  customWidgetFormSchema: typeof workbench.customWidgetFormSchema;
  defaultCustomWidgetFormValues: typeof workbench.DEFAULT_CUSTOM_WIDGET_FORM_VALUES;
  getCustomWidgetDefaultOptions: typeof customCore.getCustomWidgetDefaultOptions;
  normalizeCustomWidgetOptions: typeof customCore.normalizeCustomWidgetOptions;
  validateCustomWidgetOptions: typeof customCore.validateCustomWidgetOptions;
  getCustomWidgetSecretRequirements: typeof customCore.getCustomWidgetSecretRequirements;
  parseCustomWidgetAiResponse: typeof customCore.parseCustomWidgetAiResponse;
  translateValue(value: unknown): string;
  widgetName(kind: WidgetKind): string;
  widgetDescription(kind: WidgetKind): string;
  integrationName(kind: EditorIntegration["kind"]): string;
}

export interface EditorPermissions {
  canModifyBoard: boolean;
  isAdmin: boolean;
  canCreateIntegration: boolean;
  canModifyApps: boolean;
  canModifyAllIntegrations: boolean;
}

export type CreateWidgetDraftInput = Partial<
  Pick<BoardDraftItem, "id" | "options" | "integrationIds" | "advancedOptions">
> & {
  kind: WidgetKind;
  targetSectionId?: string;
  size?: EditorSize;
};

export type WidgetDraftChange =
  | { kind: "create"; input: CreateWidgetDraftInput }
  | { kind: "configure"; itemId: string; value: EditorState; size?: EditorSize };

export type WidgetDraftResult =
  | { kind: "staged"; draft: BoardDraft; itemId: string }
  | { kind: "rejected"; message: string };

export interface WidgetDraftWriter {
  stage(change: WidgetDraftChange): Promise<WidgetDraftResult>;
}

export interface EmbeddedEditorHandle {
  submitIfDirty(): Promise<boolean>;
  isDirty(): boolean;
}

export interface EmbeddedEditorProps {
  id: string;
  handleRef: (handle: EmbeddedEditorHandle | null) => void;
}

export interface WidgetPreviewProps {
  kind: WidgetKind;
  value: EditorState;
  size: EditorSize;
  itemId?: string;
  boardId: string;
  sectionId?: string;
  onOptionsChange(options: Record<string, unknown>): void;
}

export interface SpecializedOptionProps {
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  property: string;
  option: EditorOption;
  kind: WidgetKind;
  value: EditorState;
  initialOptions: Record<string, unknown>;
  itemId?: string;
  boardId: string;
  disabled: boolean;
  error?: string;
  onChange(value: unknown): void;
  onOptionsChange(options: Record<string, unknown>): void;
  onValidityChange(property: string, error: string | null): void;
  onDirtyChange(property: string, dirty: boolean): void;
}

export interface WidgetEditorBindings {
  secretWritesAvailable?: boolean;
  Preview?: ComponentType<WidgetPreviewProps>;
  SpecializedOption?: ComponentType<SpecializedOptionProps>;
  supportsSpecializedOption?: (type: EditorOption["type"]) => boolean;
  IntegrationEditor?: ComponentType<EmbeddedEditorProps>;
  AppEditor?: ComponentType<EmbeddedEditorProps>;
  CodeEditor?: typeof CustomWidgetCodeEditor;
  CustomJsxRenderer?: typeof CustomJsxRenderer;
  customJsxComponents?: Parameters<typeof CustomJsxRenderer>[0]["components"];
  customJsxBindings?: Parameters<typeof CustomJsxRenderer>[0]["createBindings"];
  onCreateIntegration?: (allowedKinds: EditorIntegration["kind"][]) => Promise<EditorIntegration | null>;
  widgetIcon?: (kind: WidgetKind) => ReactNode;
  IconPicker?: ComponentType<{
    value: string;
    onChange(value: string): void;
    suggestedSearch?: string;
    disabled?: boolean;
  }>;
  DateInput?: ComponentType<{
    label: string;
    description?: string;
    disabled?: boolean;
    value: string | null;
    valueFormat: string;
    onChange(value: string | null): void;
  }>;
  TimeInput?: ComponentType<{
    label: string;
    description?: string;
    disabled?: boolean;
    value: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
  }>;
}

export interface CustomWidgetEditorCapabilities {
  preview: boolean;
  save: boolean;
  liveActions: boolean;
  clearSecret: boolean;
  unavailableReason: string;
}

export type EditorTranslate = (key: string, values?: Record<string, string | number>) => string;
