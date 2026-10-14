import type { ComponentPropsWithRef, ComponentType, FunctionComponent, ReactNode } from "react";
import type { PasswordInputProps } from "@mantine/core";
import type { Client, ClientLink } from "@orpc/client";
import { createORPCClient } from "@orpc/client";
import type { z } from "zod/v4";

import type { AuthShellProps } from "../../source-ui/auth-onboarding/contracts";

export type OnboardingStep = "start" | "user" | "group" | "setup" | "finish";
export type ColorScheme = "auto" | "light" | "dark";
export type UrlTemplateMode = "hostPort" | "subdomain" | "path";
export type CornerStyle = "xs" | "sm" | "md" | "lg" | "xl";

export interface OnboardingEnvironment {
  version: string;
  currentStep: string | null;
  databaseDriver: "sqlite" | "postgresql";
  externalAuthEnabled: boolean;
  dockerConfigured: boolean;
  kubernetesConfigured: boolean;
  workshopApiUrl: string;
  workshopUrl: string;
  serverOrigin: string;
  mcpEndpoint: string;
  canConfigurePrivileged: boolean;
  hasUsers: boolean;
  initialBoard: { id: string; name: string; primaryColor: string; secondaryColor: string } | null;
  availableBoards: { id: string; name: string }[];
}

export interface InitialUser {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
}

export interface IntegrationDraft<Kind extends string, Secret extends string> {
  sourceId: string;
  name: string;
  url: string;
  kind: Kind;
  secrets: { kind: Secret; value: string }[];
  iconUrl?: string | null;
  description?: string | null;
  pingUrl?: string | null;
}

export interface DiscoveredService {
  sourceId: string;
  containerName: string;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: "label" | "docker";
  widgetKind?: string;
  description?: string;
  pingUrl?: string;
}

export interface Discovery<Kind extends string> {
  status: string;
  hosts: { host: string; status: "success" | "unavailable"; containerCount: number; reason?: string }[];
  integrations: (DiscoveredService & { kind: Kind })[];
  apps: (DiscoveredService & { detectedType?: string })[];
}

export type Capability = { status: "available"; detail?: string } | { status: "disabled" } | { status: "unavailable" };

export type NativeCall<Input, Output> = Client<Record<never, never>, Input, Output, unknown>;

export type OnboardingClient<Kind extends string, Secret extends string> = {
  onboard: {
    currentStep: NativeCall<undefined, { current: OnboardingStep; previous: OnboardingStep | null }>;
    detectRuntimeCapabilities: NativeCall<undefined, { kubernetes: Capability; workshop: Capability }>;
    discoverDockerServices: NativeCall<undefined, Discovery<Kind>>;
    testIntegration: NativeCall<IntegrationDraft<Kind, Secret>, { success: boolean }>;
  };
  user: { initUser: NativeCall<InitialUser, void> };
  group: { createInitialExternalGroup: NativeCall<{ name: string }, void> };
};

export function createOnboardingClient<Kind extends string, Secret extends string>(
  link: ClientLink<Record<never, never>>,
): OnboardingClient<Kind, Secret> {
  return createORPCClient<OnboardingClient<Kind, Secret>>(link);
}

export interface SourceSchema<Value> {
  safeParse(
    value: unknown,
    options?: { error: z.core.$ZodErrorMap<z.core.$ZodIssue> },
  ):
    | { success: true; data: Value }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } };
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface OnboardingSource<Kind extends string, Secret extends string, Locale extends string> {
  presentation: {
    classes: Readonly<Record<string, string>>;
    AuthShell: ComponentType<AuthShellProps>;
    Backdrop: ComponentType;
    Link: FunctionComponent<ComponentPropsWithRef<"a"> & { href: string }>;
    Welcome: ComponentType<{
      t: Translate;
      wordmark: ReactNode;
      backdrop: ReactNode;
      version: string;
      databaseDriver: "sqlite" | "postgresql";
      startHold: string;
      restoreHold: string;
      showRestore: boolean;
    }>;
    Finish: ComponentType<{
      t: Translate;
      wordmark: ReactNode;
      backdrop: ReactNode;
      destination: string;
      documentationUrl: string;
      primaryColor: string;
      secondaryColor: string;
      Link: FunctionComponent<ComponentPropsWithRef<"a"> & { href: string }>;
    }>;
  };
  holds: {
    authority: string;
    transition: string;
    account: string;
    restore: string;
    apiKey: string;
    assistant: string;
    preview: string;
    expired: string;
    changed: string;
    signIn: string;
  };
  normalizeOnboardingStep(step: string | null | undefined): OnboardingStep;
  getOnboardingAccessState(
    environment: Omit<OnboardingEnvironment, "currentStep"> & { currentStep: OnboardingStep },
  ): "ready" | "signIn" | "claim";
  userInitSchema: SourceSchema<InitialUser>;
  groupCreateSchema: SourceSchema<{ name: string }>;
  onboardingIntegrationDraftSchema: SourceSchema<IntegrationDraft<Kind, Secret>>;
  boardNameSchema: SourceSchema<string>;
  validationErrorMap: z.core.$ZodErrorMap<z.core.$ZodIssue>;
  supportedLanguages: readonly Locale[];
  UserCreatePasswordFields: ComponentType<{
    passwordInputProps: PasswordInputProps;
    confirmPasswordInputProps: PasswordInputProps;
  }>;
  LanguageCombobox: ComponentType<{
    label?: string;
    value: Locale;
    onChange(value: Locale): void;
    width?: string;
    withinPortal?: boolean;
  }>;
  ColorSchemeCombobox: ComponentType<{
    label?: string;
    value: ColorScheme;
    onChange(value: ColorScheme): void;
    width?: string;
  }>;
  BoardColorInput: ComponentType<{ label: string; value: string; onChange(value: string): void; defaultColor: string }>;
  CornerStylePicker: ComponentType<{
    label: string;
    value: CornerStyle;
    onChange(value: CornerStyle): void;
    labels: Record<CornerStyle, string>;
  }>;
  ServiceUrlTemplate: ComponentType<{
    serverOrigin: string;
    onServerOriginChange(value: string): void;
    mode: UrlTemplateMode;
    onModeChange(value: UrlTemplateMode): void;
    required?: boolean;
    readOnly?: boolean;
  }>;
  getIntegrationName(kind: Kind): string;
  getIntegrationDefaultUrl(kind: Kind): string | undefined;
  getIntegrationApiKeyUrl(url: string, kind: Kind): string | undefined;
  getIntegrationDocumentationUrl(kind: Kind): string | undefined;
  IntegrationAvatar: ComponentType<{ kind: Kind; size?: string; radius?: string }>;
  OnboardingFloatingControl: ComponentType<{
    ariaLabel: string;
    value: string;
    onChange(value: string): void;
    options: { value: string; label: string }[];
  }>;
  getAllSecretKindOptions(kind: Kind): readonly (readonly Secret[])[];
  buildIntegrationUrl(kind: Kind, host: string, mode: UrlTemplateMode, port?: number): string;
  buildAppUrl(slug: string, host: string, mode: UrlTemplateMode, port?: number): string;
  normalizeServiceUrl(value: string): string | null;
  resolveDiscoveredAppUrl(override: string | undefined, suggested: string | null, generated: string | null): string;
  resolveIntegrationDraftUrl(input: {
    currentUrl: string;
    overridden: boolean;
    serverUrl: string | null;
    fallbackUrl: string | null;
  }): string;
  takeNewSourceIds(sourceIds: string[], seen: Set<string>): string[];
  getBoardValidationErrors(input: {
    attempted: boolean;
    hasExistingBoards: boolean;
    selectedBoardId: string | null;
    boardName: string;
  }): { target: boolean; name: boolean };
  getWidgetKindsForIntegration(kind: Kind): readonly string[];
  widgetPreviewSizes: ReadonlyMap<string, { width: number; height: number }>;
  generalWidgets: readonly string[];
  createDocumentationLink(path: "/docs/getting-started/after-the-installation"): string;
  IntegrationMultiSelectGrid: ComponentType<{
    selectedKinds: Kind[];
    onSelectionChange(value: Kind[]): void;
    detectedKinds: Set<Kind>;
    onboarding: boolean;
  }>;
  OnboardingWordmark: ComponentType<{ primaryColor?: string; secondaryColor?: string; large?: boolean }>;
  t: Translate;
}

export interface OnboardingProps<Kind extends string, Secret extends string, Locale extends string> {
  environment: OnboardingEnvironment;
  source: OnboardingSource<Kind, Secret, Locale>;
  client: OnboardingClient<Kind, Secret>;
  currentLocale: Locale;
  claimTransport: "unsupported" | "source-http";
  accountActions?: "accepted";
  navigation: { reloadSetup(): void | Promise<void> };
  sqliteRestore?: ReactNode;
  assistantConfiguration?: ReactNode;
}

export const transitionHold =
  "Setup cannot advance here: onboard.nextStep and onboard.completeSetup have no native handlers. Your choices are not saved. The transaction-time claim, authority and atomic completion bindings remain unsupported.";

export const authorityHold =
  "Onboarding is unavailable until the native setup context, claim route and current authority bindings are installed. No account, group or board has been created by this screen.";
