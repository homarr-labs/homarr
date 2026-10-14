import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { extractErrorMessage } from "../../../../../packages/common/src/error";
import { useI18n } from "../../../../../packages/translation/src/standalone/client";

import type { BrandingEditorSlots } from "./branding-fields";
import type { InstanceSettings, SettingsFeatureClient, SettingsReadScope, UserPreferences } from "./client";
import type { SettingsFormatting } from "./culture";
import type { HeaderComposerBoard, HeaderComposerProps } from "../../source-ui/settings/header-composer";
import { readInstanceSettings, readPreferenceSettings } from "./data";
import { InstanceSettingsForm } from "./instance-form";
import { PreferenceSettingsForm } from "./preference-form";

export function InstanceSettingsPage({
  client,
  scope,
  initialData,
  brandingSlots,
  boards,
  analyticsDocumentationHref,
  onSaved,
}: {
  readonly client: SettingsFeatureClient;
  readonly scope: SettingsReadScope;
  readonly initialData?: Awaited<ReturnType<typeof readInstanceSettings>>;
  readonly brandingSlots?: BrandingEditorSlots;
  readonly boards?: readonly HeaderComposerBoard[];
  readonly analyticsDocumentationHref: string;
  readonly onSaved?: (settings: InstanceSettings) => void;
}) {
  const queryClient = useQueryClient();
  const publishCanonical = useSettingsPublication(client, scope, "instance", queryClient, onSaved);
  const query = useQuery({
    queryKey: ["settings", scope.cacheScope, "instance"],
    queryFn: ({ signal }) => readInstanceSettings(client, signal),
    initialData,
    enabled: scope.access.kind !== "denied",
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (scope.access.kind === "denied") return <Alert color="yellow">{scope.access.reason}</Alert>;
  if (query.isPending) return <SettingsLoading />;
  if (!query.data) return <SettingsReadError error={query.error} onRetry={() => void query.refetch()} />;
  return (
    <Stack gap="md">
      {query.isError && <SettingsReadError error={query.error} onRetry={() => void query.refetch()} />}
      <InstanceSettingsForm
        key={scope.cacheScope}
        client={client}
        initialData={query.data.settings}
        searchEngines={query.data.searchEngines}
        access={scope.access}
        cacheScope={scope.cacheScope}
        brandingSlots={brandingSlots}
        boards={boards}
        analyticsDocumentationHref={analyticsDocumentationHref}
        onSaved={(settings) =>
          publishCanonical(settings, ["settings", scope.cacheScope, "instance"], () => {
            queryClient.setQueryData<Awaited<ReturnType<typeof readInstanceSettings>>>(
              ["settings", scope.cacheScope, "instance"],
              (current) => (current ? { ...current, settings } : current),
            );
          })
        }
      />
    </Stack>
  );
}

export function PreferenceSettingsPage({
  client,
  scope,
  userId,
  formatting,
  initialData,
  languageSlot,
  boards,
  headerComposer,
  onSaved,
}: {
  readonly client: SettingsFeatureClient;
  readonly scope: SettingsReadScope;
  readonly userId: string;
  readonly formatting: SettingsFormatting;
  readonly initialData?: Awaited<ReturnType<typeof readPreferenceSettings>>;
  readonly languageSlot?: ReactNode;
  readonly boards?: readonly HeaderComposerBoard[];
  readonly headerComposer: Pick<HeaderComposerProps, "appName" | "logo" | "renderBoardPreview">;
  readonly onSaved?: (preferences: UserPreferences) => void;
}) {
  const queryClient = useQueryClient();
  const publishCanonical = useSettingsPublication(client, scope, userId, queryClient, onSaved);
  const query = useQuery({
    queryKey: ["settings", scope.cacheScope, "preferences", userId],
    queryFn: ({ signal }) => readPreferenceSettings(client, userId, signal),
    initialData,
    enabled: scope.access.kind !== "denied",
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (scope.access.kind === "denied") return <Alert color="yellow">{scope.access.reason}</Alert>;
  if (query.isPending) return <SettingsLoading />;
  if (!query.data) return <SettingsReadError error={query.error} onRetry={() => void query.refetch()} />;
  return (
    <Stack gap="md">
      {query.isError && <SettingsReadError error={query.error} onRetry={() => void query.refetch()} />}
      <PreferenceSettingsForm
        key={`${scope.cacheScope}:${userId}`}
        client={client}
        initialData={query.data.preferences}
        searchEngines={query.data.searchEngines}
        formatting={formatting}
        access={scope.access}
        cacheScope={scope.cacheScope}
        languageSlot={languageSlot}
        boards={boards}
        headerComposer={headerComposer}
        onSaved={(preferences) =>
          publishCanonical(preferences, ["settings", scope.cacheScope, "preferences", userId], () => {
            queryClient.setQueryData<Awaited<ReturnType<typeof readPreferenceSettings>>>(
              ["settings", scope.cacheScope, "preferences", userId],
              (current) => (current ? { ...current, preferences } : current),
            );
          })
        }
      />
    </Stack>
  );
}

interface SettingsPublicationGeneration {
  readonly generation: number;
  readonly client: SettingsFeatureClient;
  readonly cacheScope: string;
  readonly targetId: string;
  readonly access: SettingsReadScope["access"]["kind"];
  readonly queryClient: ReturnType<typeof useQueryClient>;
  mounted: boolean;
}

function useSettingsPublication<Snapshot>(
  client: SettingsFeatureClient,
  scope: SettingsReadScope,
  targetId: string,
  queryClient: ReturnType<typeof useQueryClient>,
  onSaved?: (snapshot: Snapshot) => void,
) {
  const generation = useRef(0);
  const currentFlow = useRef<SettingsPublicationGeneration | null>(null);
  const latestOnSaved = useRef(onSaved);
  useLayoutEffect(() => {
    latestOnSaved.current = onSaved;
  }, [onSaved]);
  useLayoutEffect(() => {
    const active = {
      generation: ++generation.current,
      client,
      cacheScope: scope.cacheScope,
      targetId,
      access: scope.access.kind,
      queryClient,
      mounted: true,
    };
    currentFlow.current = active;
    return () => {
      active.mounted = false;
    };
  }, [client, scope.cacheScope, targetId, scope.access.kind, queryClient]);
  return async (snapshot: Snapshot, queryKey: readonly string[], publish: () => void) => {
    const active = currentFlow.current;
    if (
      !active?.mounted ||
      active.client !== client ||
      active.cacheScope !== scope.cacheScope ||
      active.targetId !== targetId ||
      active.access !== "editable" ||
      active.access !== scope.access.kind ||
      active.queryClient !== queryClient
    )
      return;
    const isCurrent = () => active.mounted && currentFlow.current?.generation === active.generation;
    await queryClient.cancelQueries({ queryKey, exact: true });
    if (!isCurrent()) return;
    publish();
    if (isCurrent()) latestOnSaved.current?.(snapshot);
  };
}

function SettingsLoading() {
  const t = useI18n();
  return (
    <Center component="output" p="xl">
      <Stack align="center">
        <Loader />
        <Text>{t("common.action.loading")}</Text>
      </Stack>
    </Center>
  );
}

function SettingsReadError({ error, onRetry }: { readonly error: unknown; readonly onRetry: () => void }) {
  const t = useI18n();
  return (
    <Alert color="red" title={t("common.error")} role="alert">
      <Stack gap="xs">
        <Text size="sm">
          {error instanceof Error || typeof error === "string" ? extractErrorMessage(error) : t("common.error")}
        </Text>
        <Button variant="default" onClick={onRetry}>
          {t("common.action.tryAgain")}
        </Button>
      </Stack>
    </Alert>
  );
}
