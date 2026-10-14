import type { PropsWithChildren, ReactNode } from "react";
import type { ComponentType } from "react";
import type { FormValidateInput } from "@mantine/form";
import type { IconProps } from "@tabler/icons-react";
import type { IntegrationKind } from "@homarr/definitions";
import type { boardSettingsSchema } from "@homarr/validation/board";
import type { z } from "zod/v4";
import { createContext, useContext } from "react";

import type { AssistantConversationExportInput } from "./assistant-conversation-export";
import type { AssistantDirectiveEntity } from "./assistant-markdown-directives";
import type { AssistantRequestStep } from "./assistant-message-metadata";
import type { ConfigureWidgetArgs } from "./assistant-tool-contracts";

export type AssistantBoardSettings = z.infer<typeof boardSettingsSchema>;
export type AssistantBoardSettingsValues = Omit<AssistantBoardSettings, "id" | "name">;

export interface AssistantSourceReadOwner {
  scopeKey: string;
  conversationId: string;
  toolCallId: string;
}

export interface AssistantSourceRead<T> {
  data?: T;
  isPending: boolean;
  isError: boolean;
  owner?: AssistantSourceReadOwner;
  unavailableReason?: string;
  refetch?: () => Promise<unknown>;
}

export const isAssistantSourceReadCurrent = <T,>(read: AssistantSourceRead<T>, owner: AssistantSourceReadOwner) =>
  read.data !== undefined &&
  !read.isPending &&
  !read.isError &&
  read.unavailableReason === undefined &&
  read.owner?.scopeKey === owner.scopeKey &&
  read.owner.conversationId === owner.conversationId &&
  read.owner.toolCallId === owner.toolCallId;

export interface AssistantWidgetIntegration {
  id: string;
  name: string;
  kind: IntegrationKind;
  permissions: { hasUseAccess: boolean };
}

export interface AssistantWidgetDefinition {
  icon: ComponentType<IconProps>;
  createOptions: (settings: AssistantWidgetSettings) => Record<string, { defaultValue?: unknown }>;
  supportedIntegrations?: readonly IntegrationKind[];
  maxIntegrations?: number;
  integrationsRequired?: boolean;
}

export interface AssistantWidgetValue {
  advancedOptions: { title: null; customCssClasses: string[]; borderColor: string };
  options: Record<string, unknown>;
  integrationIds: string[];
}

export interface AssistantWidgetSettings {
  enableStatusByDefault: boolean;
  forceDisableStatus: boolean;
}

interface AssistantWidgetModalProps {
  kind: ConfigureWidgetArgs["kind"];
  value: AssistantWidgetValue;
  integrationData: AssistantWidgetIntegration[];
  integrationSupport: boolean;
  settings: AssistantWidgetSettings;
  onSuccessfulEdit: (value: { options: Record<string, unknown>; integrationIds: string[] }) => void;
}

interface AssistantWidgetModalOptions {
  title: (translate: AssistantSourceTranslate) => string;
}

export interface AssistantWidgetDefinitionAdapter {
  kind: ConfigureWidgetArgs["kind"];
  definition: AssistantWidgetDefinition;
  reduceOptions: (
    settings: AssistantWidgetSettings,
    options: Record<string, unknown> | undefined,
  ) => Record<string, unknown>;
  openWidgetModal: (props: AssistantWidgetModalProps, options: AssistantWidgetModalOptions) => void;
}

export const bindAssistantWidgetDefinition = <TDefinition extends AssistantWidgetDefinition>(
  kind: ConfigureWidgetArgs["kind"],
  definition: TDefinition,
  native: {
    reduceOptions: (
      definition: TDefinition,
      settings: AssistantWidgetSettings,
      options: Record<string, unknown> | undefined,
    ) => Record<string, unknown>;
    openWidgetModal: (
      props: AssistantWidgetModalProps & { definition: TDefinition },
      options: AssistantWidgetModalOptions,
    ) => void;
  },
): AssistantWidgetDefinitionAdapter => ({
  kind,
  definition,
  reduceOptions: (settings, options) => native.reduceOptions(definition, settings, options),
  openWidgetModal: (props, options) => native.openWidgetModal({ ...props, definition }, options),
});

export type AssistantWidgetResources =
  | { kind: "held"; reason: string }
  | {
      kind: "available";
      settings: AssistantWidgetSettings;
      canCreateIntegration: boolean;
      loadDefinition: (kind: ConfigureWidgetArgs["kind"]) => Promise<AssistantWidgetDefinitionAdapter>;
      openIntegrationModal: (props: {
        allowedKinds: readonly IntegrationKind[];
        onSuccess: (created: { integration: AssistantWidgetIntegration } | undefined) => void;
      }) => void;
    };

export type AssistantSourceAction =
  | "send"
  | "attachments"
  | "approve"
  | "answer"
  | "configureApp"
  | "configureBoard"
  | "configureWidget"
  | "feedback"
  | "edit"
  | "regenerate"
  | "newConversation"
  | "renameConversation"
  | "deleteConversation"
  | "exportConversation"
  | "refresh"
  | "model"
  | "providerSignIn"
  | "providerQuota";

export type AssistantSourceAvailability = { kind: "available" } | { kind: "held"; reason: string };

export interface AssistantSourceTranslate {
  (key: string, values?: Record<string, string | number>): string;
  rich(key: string, values: Record<string, string | number | (() => ReactNode)>): ReactNode;
}

export interface AssistantSourceNotification {
  title: string;
  message: string;
}

export interface AssistantAppFormValues {
  name: string;
  description: string | null;
  iconUrl: string;
  href: string | null;
  pingUrl: string | null;
}

export interface AssistantAppFormProps {
  initialValues: AssistantAppFormValues;
  buttonLabels: { submit: string };
  showBackToOverview: false;
  handleSubmit: (values: AssistantAppFormValues) => void;
  isPending: boolean;
}

export interface AssistantGenerationTelemetrySnapshot {
  data?: { complete: boolean; generations: Partial<AssistantRequestStep>[] };
  isFetching: boolean;
  unavailableReason?: string;
}

export interface AssistantSourceBindings {
  scope: { key: string; signal: AbortSignal; readOnly: boolean };
  locale: string;
  unavailableLabel: string;
  translate: (namespace: string) => AssistantSourceTranslate;
  relativeTime: (date: Date, refreshInterval: number) => string;
  navigation: { push: (href: string) => void; prefetch: (href: string) => void };
  notifications: {
    showErrorNotification: (notification: AssistantSourceNotification) => void;
    showSuccessNotification: (notification: AssistantSourceNotification) => void;
  };
  actions: Partial<Record<AssistantSourceAction, AssistantSourceAvailability>>;
  entities: { entities: AssistantDirectiveEntity[]; isLoading: boolean; unavailableReason?: string };
  useGenerationTelemetry: (
    input: { threadId: string; messageId: string },
    options: { enabled: boolean; maximumReads: number; interval: number },
  ) => AssistantGenerationTelemetrySnapshot;
  readConversation?: (threadId: string, signal: AbortSignal) => Promise<AssistantConversationExportInput>;
  renderAppForm?: (props: AssistantAppFormProps) => ReactNode;
  useBoardSettings: (
    input: { id: string },
    options: { enabled: boolean; owner: AssistantSourceReadOwner },
  ) => AssistantSourceRead<AssistantBoardSettings>;
  boardSettingsValidate?: FormValidateInput<AssistantBoardSettingsValues>;
  useWidgetIntegrations: (options: {
    enabled: boolean;
    owner: AssistantSourceReadOwner;
  }) => AssistantSourceRead<AssistantWidgetIntegration[]>;
  widgets: AssistantWidgetResources;
}

const AssistantSourceContext = createContext<AssistantSourceBindings | null>(null);

export function AssistantSourceBindingsProvider({
  bindings,
  children,
}: PropsWithChildren<{ bindings: AssistantSourceBindings }>) {
  return <AssistantSourceContext.Provider value={bindings}>{children}</AssistantSourceContext.Provider>;
}

export function useAssistantSourceBindings() {
  const bindings = useContext(AssistantSourceContext);
  if (!bindings) throw new Error("AssistantSourceBindingsProvider is required");
  return bindings;
}

export function useAssistantSourceAction(action: AssistantSourceAction) {
  const bindings = useAssistantSourceBindings();
  const availability = bindings.actions[action];
  const readAction = action === "exportConversation" || action === "refresh" || action === "providerQuota";
  let reason = bindings.unavailableLabel;
  if (availability?.kind === "held") reason = availability.reason;
  return {
    get enabled() {
      return (
        !bindings.scope.signal.aborted &&
        (!bindings.scope.readOnly || readAction) &&
        bindings.actions[action]?.kind === "available"
      );
    },
    reason,
  };
}

export function useI18n(namespace = "") {
  return useAssistantSourceBindings().translate(namespace);
}

export function useCurrentIntlLocale() {
  return useAssistantSourceBindings().locale;
}

export function useTimeAgo(date: Date, refreshInterval: number) {
  return useAssistantSourceBindings().relativeTime(date, refreshInterval);
}

export function useRouter() {
  return useAssistantSourceBindings().navigation;
}

export function useAssistantNotifications() {
  return useAssistantSourceBindings().notifications;
}
