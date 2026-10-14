import { useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Fieldset,
  Group,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconRefresh } from "@tabler/icons-react";

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import { BoardSelect } from "../../source-ui/settings/board-select";
import type { HeaderComposerProps } from "../../source-ui/settings/header-composer";
import { SettingsSection } from "../settings/section";
import type { UserPreferences } from "./client";
import { useIdentity, useIdentityKey } from "./boundary";
import { ActionFeedback, IdentityDenied, IdentityError, IdentityLoading, useIdentityAction } from "./feedback";
import { userPreferencesPatchSchema, validationMessage } from "./validation";
import { HeaderPreferencesEditor } from "./header-preferences";
import { useIdentityDraft } from "./draft";

export interface UserPreferencesPresentation {
  readonly header: Pick<HeaderComposerProps, "appName" | "logo" | "renderBoardPreview">;
  readonly weekdays: readonly string[];
  readonly language?: ReactNode;
}

export function UserPreferencesForm({
  userId,
  presentation,
  mutationHoldReason = "Durable preference and tour writes are unavailable until the native authority binding is accepted.",
}: {
  readonly userId: string;
  readonly presentation?: UserPreferencesPresentation;
  readonly mutationHoldReason?: string | null;
}) {
  const { client, principal } = useIdentity();
  const key = useIdentityKey();
  const permitted = principal.user.id === userId || principal.user.permissions.includes("admin");
  const query = useQuery({
    queryKey: [...key, "preferences", userId],
    queryFn: ({ signal }) => client.user.getPreferences({ userId }, { signal }),
    enabled: permitted,
  });
  if (!permitted) return <IdentityDenied />;
  if (!query.data)
    return query.isError ? (
      <IdentityError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <IdentityLoading />
    );
  return (
    <Stack>
      {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
      <PreferencesFields
        key={query.data.userId}
        initial={query.data}
        presentation={presentation}
        mutationHoldReason={mutationHoldReason}
      />
    </Stack>
  );
}

function PreferencesFields({
  initial,
  presentation,
  mutationHoldReason,
}: {
  readonly initial: UserPreferences;
  readonly presentation?: UserPreferencesPresentation;
  readonly mutationHoldReason: string | null;
}) {
  const { client, demo, principal, queryClient } = useIdentity();
  const key = useIdentityKey();
  const tUser = useI18n("user");
  const tCommon = useI18n("common");
  const tGeneral = useI18n("management.page.user.setting.general");
  const tAppearance = useI18n("management.page.settings.section.appearance");
  const draft = useIdentityDraft(initial);
  const { value: values, setValue: setValues, dirty } = draft;
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const boards = useQuery({
    queryKey: [...key, "user-boards", initial.userId],
    queryFn: ({ signal }) => client.board.getManageOverview({ userId: initial.userId, fullPreview: false }, { signal }),
  });
  const engines = useQuery({
    queryKey: [...key, "search-engines"],
    queryFn: ({ signal }) => client.searchEngine.getSelectable({ withIntegrations: true }, { signal }),
  });
  const self = principal.user.id === initial.userId;
  const boardOptions = (boards.data ?? []).map((board) => ({
    id: board.id,
    name: board.name,
    logoImageUrl: board.logoImageUrl,
  }));
  const disabled = action.pending || (demo.enabled && demo.readOnly);
  const valid = userPreferencesPatchSchema.safeParse(
    Object.fromEntries(Object.entries(values).filter(([field]) => field !== "userId")),
  ).success;
  const change = <Key extends keyof UserPreferences>(field: Key, value: UserPreferences[Key]) => {
    if (!disabled) setValues({ ...values, [field]: value });
  };
  return (
    <Stack gap="lg">
      <HeaderPreferencesEditor
        value={values.headerPreferences}
        onChange={(next) => change("headerPreferences", next)}
        boards={boardOptions.map((board) => ({ value: board.id, label: board.name, logoImageUrl: board.logoImageUrl }))}
        disabled={disabled || boards.isPending || boards.isError}
        homeBoardId={values.homeBoardId}
        mobileHomeBoardId={values.mobileHomeBoardId}
        presentation={presentation?.header}
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (disabled || mutationHoldReason !== null || !dirty) return;
          const { userId, ...preferences } = values;
          const changed = Object.fromEntries(
            Object.entries(preferences).filter(
              ([field, value]) => JSON.stringify(value) !== JSON.stringify(Reflect.get(draft.baseline, field)),
            ),
          );
          const parsed = userPreferencesPatchSchema.safeParse(changed);
          if (!parsed.success) {
            setValidation(validationMessage(parsed.error.issues));
            return;
          }
          setValidation(null);
          await action.run(
            async (signal) => {
              const canonical = await client.user.updatePreferences({ userId, ...parsed.data }, { signal });
              await queryClient.cancelQueries({ queryKey: [...key, "preferences", userId], exact: true });
              return canonical;
            },
            {
              refreshAuthority: self,
              onSuccess: (canonical) => {
                queryClient.setQueryData([...key, "preferences", userId], canonical);
                draft.acknowledge(canonical);
              },
            },
          );
        }}
      >
        <Stack gap="lg">
          <Fieldset disabled={disabled} variant="unstyled">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" verticalSpacing="lg">
              <SettingsSection title={tGeneral("item.board.title")}>
                {boards.isError ? (
                  <IdentityError error={boards.error} retry={() => void boards.refetch()} />
                ) : (
                  <>
                    <BoardSelect
                      label={tGeneral("item.board.type.general")}
                      boards={boardOptions}
                      clearable
                      disabled={disabled || boards.isPending}
                      value={values.homeBoardId}
                      onChange={(next) => change("homeBoardId", next)}
                    />
                    <BoardSelect
                      label={tGeneral("item.board.type.mobile")}
                      boards={boardOptions}
                      clearable
                      disabled={disabled || boards.isPending}
                      value={values.mobileHomeBoardId}
                      onChange={(next) => change("mobileHomeBoardId", next)}
                    />
                  </>
                )}
              </SettingsSection>
              <SettingsSection title={tGeneral("item.search")}>
                {engines.isError ? (
                  <IdentityError error={engines.error} retry={() => void engines.refetch()} />
                ) : (
                  <Select
                    label={tUser("field.defaultSearchEngine.label")}
                    value={values.defaultSearchEngineId}
                    data={engines.data ?? []}
                    comboboxProps={{ withinPortal: true }}
                    disabled={disabled || engines.isPending}
                    onChange={(next) => change("defaultSearchEngineId", next)}
                  />
                )}
                <Switch
                  label={tUser("field.openSearchInNewTab.label")}
                  checked={values.openSearchInNewTab}
                  disabled={disabled}
                  onChange={(event) => change("openSearchInNewTab", event.currentTarget.checked)}
                />
                <Switch
                  label={tUser("field.ddgBangs.label")}
                  checked={values.ddgBangs}
                  disabled={disabled}
                  onChange={(event) => change("ddgBangs", event.currentTarget.checked)}
                />
              </SettingsSection>
              <SettingsSection title={tGeneral("item.language")}>
                {self && presentation?.language}
                <Title order={4}>{tGeneral("item.firstDayOfWeek")}</Title>
                {presentation ? (
                  <Radio.Group
                    value={String(values.firstDayOfWeek)}
                    onChange={(next) => {
                      if (next === "0") change("firstDayOfWeek", 0);
                      if (next === "1") change("firstDayOfWeek", 1);
                      if (next === "6") change("firstDayOfWeek", 6);
                    }}
                  >
                    <Group mt="xs" wrap="wrap">
                      {([1, 6, 0] as const).map((day) => (
                        <Radio key={day} value={String(day)} label={presentation.weekdays[day]} disabled={disabled} />
                      ))}
                    </Group>
                  </Radio.Group>
                ) : (
                  <Alert color="yellow">
                    Culture controls unavailable until the source weekday formatter is bound.
                  </Alert>
                )}
                <Divider my="xs" />
                <Select<UserPreferences["byteUnitSystem"]>
                  label={tUser("field.byteUnitSystem.label")}
                  description={tUser("field.byteUnitSystem.description")}
                  data={[
                    { value: "decimal", label: `${tUser("field.byteUnitSystem.options.decimal")} (KB, MB, GB)` },
                    { value: "binary", label: `${tUser("field.byteUnitSystem.options.binary")} (KiB, MiB, GiB)` },
                  ]}
                  value={values.byteUnitSystem}
                  allowDeselect={false}
                  disabled={disabled}
                  comboboxProps={{ withinPortal: true }}
                  onChange={(next) => {
                    if (next !== null) change("byteUnitSystem", next);
                  }}
                />
                <Divider my="xs" />
                <Title order={4}>{tGeneral("item.accessibility")}</Title>
                <Switch
                  label={tUser("field.pingIconsEnabled.label")}
                  checked={values.pingIconsEnabled}
                  disabled={disabled}
                  onChange={(event) => change("pingIconsEnabled", event.currentTarget.checked)}
                />
                <Switch
                  label={tUser("field.enableRightClickOnWidgets.label")}
                  description={tUser("field.enableRightClickOnWidgets.description")}
                  checked={values.enableRightClickOnWidgets}
                  disabled={disabled}
                  onChange={(event) => change("enableRightClickOnWidgets", event.currentTarget.checked)}
                />
              </SettingsSection>
              <SettingsSection title={tAppearance("title")}>
                <Select<UserPreferences["colorScheme"]>
                  label={tAppearance("defaultColorScheme.label")}
                  value={values.colorScheme}
                  data={(["auto", "light", "dark"] as const).map((value) => ({
                    value,
                    label: tCommon(`colorScheme.options.${value}`),
                  }))}
                  allowDeselect={false}
                  disabled={disabled}
                  onChange={(next) => {
                    if (next !== null) change("colorScheme", next);
                  }}
                />
              </SettingsSection>
            </SimpleGrid>
          </Fieldset>
          {validation && <IdentityError error={validation} />}
          <ActionFeedback action={action} />
          {mutationHoldReason !== null && <Alert color="yellow">{mutationHoldReason}</Alert>}
          {draft.changed && (
            <Alert title="Preferences changed remotely">
              Your draft and original baseline are retained. Only changed fields are submitted. Discard to use the
              latest preferences.
            </Alert>
          )}
          {dirty && (
            <div style={{ position: "sticky", bottom: 20 }}>
              <Group justify="space-between" wrap="wrap">
                <Text fw={500}>{tCommon("unsavedChanges")}</Text>
                <Group>
                  <Button
                    type="button"
                    variant="default"
                    disabled={action.pending}
                    onClick={() => {
                      draft.discard();
                      setValidation(null);
                      action.clear();
                    }}
                  >
                    {tCommon("action.discard")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={disabled || mutationHoldReason !== null || !valid}
                    loading={action.pending}
                  >
                    {tCommon("action.saveChanges")}
                  </Button>
                </Group>
              </Group>
            </div>
          )}
        </Stack>
      </form>
      {self && <TourSettings mutationHoldReason={mutationHoldReason} />}
    </Stack>
  );
}

function TourSettings({ mutationHoldReason }: { readonly mutationHoldReason: string | null }) {
  const { client, demo } = useIdentity();
  const key = useIdentityKey();
  const t = useI18n("management.page.user.setting.general.item.onboardingTours");
  const action = useIdentityAction();
  const query = useQuery({
    queryKey: [...key, "tours"],
    queryFn: ({ signal }) => client.user.getTourStatus(undefined, { signal }),
  });
  return (
    <Stack gap="xs">
      {query.isError ? (
        <IdentityError error={query.error} retry={() => void query.refetch()} />
      ) : query.isPending ? (
        <IdentityLoading />
      ) : (
        <Group gap="xs">
          {[
            { name: "management" as const, completed: query.data.completedManageTour },
            { name: "dashboard" as const, completed: query.data.completedBoardTour },
          ].map((tour) => (
            <Badge key={tour.name} color={tour.completed ? "green" : "gray"} variant="light">
              {t(`name.${tour.name}`)}: {tour.completed ? t("status.completed") : t("status.notStarted")}
            </Badge>
          ))}
        </Group>
      )}
      <Text size="sm" c="dimmed">
        {t("description")}
      </Text>
      <Button
        leftSection={<IconRefresh size={16} />}
        variant="light"
        size="sm"
        w="fit-content"
        disabled={mutationHoldReason !== null || query.isPending || query.isError || (demo.enabled && demo.readOnly)}
        loading={action.pending}
        onClick={() => {
          if (mutationHoldReason !== null) return;
          void action.run((signal) => client.user.resetTours(undefined, { signal }));
        }}
      >
        {t("reset")}
      </Button>
      <ActionFeedback action={action} />
    </Stack>
  );
}
