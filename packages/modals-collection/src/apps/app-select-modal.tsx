import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Center,
  Group,
  Image,
  Input,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSearch } from "@tabler/icons-react";

import { createModal, modalSizeSelect } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import type { TranslationFunction } from "@homarr/translation";
import { selectGridCols, SelectableCard } from "@homarr/ui";

import { AppForm } from "@homarr/forms-collection";
import type {
  AppCreateOutcome,
  AppCreateOutcomeLabels,
  AppFormProps,
  AppFormValues,
  CreatedApp,
} from "@homarr/forms-collection";
import { showErrorNotification } from "@homarr/notifications";

export interface SelectableApp extends AppFormValues {
  id: string;
}

export interface AppSelectModalProps {
  onSelect?: (app: SelectableApp) => void;
  onSelectMany?: (apps: SelectableApp[]) => void;
  withCreate: boolean;
  apps: SelectableApp[];
  isPending: boolean;
  canCreate: boolean;
  createApp?: (values: AppFormValues) => Promise<CreatedApp>;
  onCreated: (app: CreatedApp) => Promise<void>;
  isCreating: boolean;
  iconPickerProps: AppFormProps["iconPickerProps"];
  isCurrentOwner: () => boolean;
  onDirtyChange: AppFormProps["onDirtyChange"];
  captureSubmissionOwner: AppFormProps["captureSubmissionOwner"];
  outcomeLabels: AppCreateOutcomeLabels;
}

export interface AppSelectContentProps {
  innerProps: AppSelectModalProps;
  actions: { closeModal: () => void };
}

export const AppSelectContent = ({ actions, innerProps }: AppSelectContentProps) => {
  const [search, setSearch] = useState("");
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [createdApps, setCreatedApps] = useState<SelectableApp[]>([]);
  const [creating, setCreating] = useState(false);
  const owner = useRef({ active: false });
  const creationOwner = useRef(0);
  const outcomeRef = useRef<AppCreateOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<AppCreateOutcome>(outcomeRef.current);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  const submissionOwner = useRef<ReturnType<AppFormProps["captureSubmissionOwner"]> | null>(null);
  const { captureSubmissionOwner, isCurrentOwner, onDirtyChange } = innerProps;
  useLayoutEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, [captureSubmissionOwner, isCurrentOwner, onDirtyChange]);
  const captureOwner = useCallback(() => {
    const lease = owner.current;
    const generation = creationOwner.current;
    const captured = captureSubmissionOwner();
    const origin = {
      isCurrent: () => lease.active && generation === creationOwner.current && captured.isCurrent() && isCurrentOwner(),
    };
    submissionOwner.current = origin;
    return origin;
  }, [captureSubmissionOwner, isCurrentOwner]);
  const t = useI18n();
  const { apps, isPending, isCreating, createApp } = innerProps;
  const canCreate = innerProps.withCreate && innerProps.canCreate && createApp !== undefined && outcome.kind === "idle";
  const multiSelectAvailable = Boolean(innerProps.onSelectMany);

  const selectableApps = useMemo(
    () => [...apps, ...createdApps.filter((createdApp) => !apps.some((app) => app.id === createdApp.id))],
    [apps, createdApps],
  );

  const filteredApps = useMemo(
    () =>
      selectableApps
        .filter((app) => {
          const query = search.trim().toLowerCase();
          return app.name.toLowerCase().includes(query) || Boolean(app.href?.toLowerCase().includes(query));
        })
        .sort((appA, appB) => appA.name.localeCompare(appB.name)),
    [search, selectableApps],
  );

  const selectedApps = useMemo(
    () => selectableApps.filter((app) => selectedAppIds.has(app.id)),
    [selectableApps, selectedAppIds],
  );

  const handleSelect = (app: SelectableApp) => {
    const lease = owner.current;
    const captured = captureSubmissionOwner();
    const isCurrent = () => lease.active && captured.isCurrent() && isCurrentOwner();
    if (!isCurrent()) return;
    if (!multiSelectAvailable) {
      innerProps.onSelect?.(app);
      if (isCurrent()) actions.closeModal();
      return;
    }
    setSelectedAppIds((current) => {
      const next = new Set(current);
      if (next.has(app.id)) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
  };

  const handleMultiSubmit = () => {
    const lease = owner.current;
    const captured = captureSubmissionOwner();
    const isCurrent = () => lease.active && captured.isCurrent() && isCurrentOwner();
    if (!isCurrent()) return;
    innerProps.onSelectMany?.(selectedApps);
    if (isCurrent()) actions.closeModal();
  };

  const publishOutcome = (next: AppCreateOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };

  const handleCreate = async (values: AppFormValues, finish: boolean, afterSuccess?: () => void) => {
    const lease = owner.current;
    const generation = creationOwner.current;
    const captured = submissionOwner.current;
    const isCurrent = () =>
      lease.active && generation === creationOwner.current && captured !== null && captured.isCurrent();
    if (!canCreate || !createApp || !isCurrent() || submitting.current || outcomeRef.current.kind !== "idle")
      throw new Error("App creation unavailable");
    submitting.current = true;
    setIsSubmitting(true);
    let app: CreatedApp;
    try {
      app = await createApp(values);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      submitting.current = false;
      if (lease.active) setIsSubmitting(false);
      if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.unknown });
      throw error;
    }
    publishOutcome({ kind: "confirmed", app });
    const reconcile = async () => {
      try {
        await innerProps.onCreated(app);
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", app, error });
        if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", app });
      retryReconciliation.current = null;
      if (!isCurrent()) return;
      setCreatedApps((current) => [...current, app]);
      setSelectedAppIds((current) => new Set(current).add(app.id));
      if (!finish) {
        if (isCurrent()) afterSuccess?.();
        if (isCurrent()) publishOutcome({ kind: "idle" });
        return;
      }
      if (isCurrent()) {
        if (multiSelectAvailable) innerProps.onSelectMany?.([...selectedApps, app]);
        else innerProps.onSelect?.(app);
      }
      if (isCurrent()) actions.closeModal();
    };
    retryReconciliation.current = async () => {
      if (
        !lease.active ||
        captured === null ||
        !captured.isCurrent() ||
        submitting.current ||
        outcomeRef.current.kind !== "reconcileheld"
      )
        return;
      submitting.current = true;
      setIsSubmitting(true);
      await reconcile();
    };
    await reconcile();
  };

  return (
    <Stack gap="md">
      {creating ? (
        <Stack>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => {
              creationOwner.current += 1;
              setCreating(false);
            }}
            disabled={isCreating || isSubmitting}
            style={{ alignSelf: "flex-start" }}
          >
            {t("app.action.select.backToApps")}
          </Button>
          <AppForm
            iconPickerProps={innerProps.iconPickerProps}
            disabled={!canCreate}
            isCurrentOwner={innerProps.isCurrentOwner}
            onDirtyChange={onDirtyChange}
            captureSubmissionOwner={captureOwner}
            showBackToOverview={false}
            buttonLabels={{
              submit: t("app.action.select.createAndAdd"),
              submitAndCreateAnother: multiSelectAvailable ? t("app.action.select.createAnother") : undefined,
            }}
            isPending={isCreating || isSubmitting}
            handleSubmit={handleCreate}
          />
        </Stack>
      ) : (
        <>
          {/* Top Search Input */}
          <Stack gap={6}>
            <Input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              placeholder={`${t("app.action.select.search")}...`}
              aria-label={t("app.action.select.search")}
              data-autofocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredApps.length === 1 && filteredApps[0]) {
                  handleSelect(filteredApps[0]);
                }
              }}
            />
          </Stack>

          {/* Scrollable Container with App Cards */}
          <ScrollArea.Autosize mah="70vh" offsetScrollbars>
            <Stack gap="md" pt="xs" pr="xs" px={4}>
              <SimpleGrid cols={selectGridCols} spacing="sm">
                {canCreate && (
                  <SelectableCard
                    onClick={() => {
                      creationOwner.current += 1;
                      setCreating(true);
                    }}
                    style={{ borderStyle: "dashed" }}
                    icon={
                      <ThemeIcon variant="light" color="primaryColor" size={34} radius="md">
                        <IconPlus size={20} />
                      </ThemeIcon>
                    }
                    title={t("app.action.create.title")}
                    description={t("app.action.create.description")}
                    footerLeft={
                      <Text size="xs" c="dimmed">
                        {t("app.action.select.customApplication")}
                      </Text>
                    }
                  />
                )}

                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isSelected={selectedAppIds.has(app.id)}
                    multiSelectActive={multiSelectAvailable}
                    onSelect={handleSelect}
                  />
                ))}
              </SimpleGrid>

              {filteredApps.length === 0 && !isPending && (
                <Center p="xl">
                  <Text c="dimmed">{t("app.action.select.noResults")}</Text>
                </Center>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </>
      )}

      {/* Multi-Select Action Footer */}
      {multiSelectAvailable && (
        <Paper withBorder p="xs" radius="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              {t("app.action.select.appsSelected", { count: selectedApps.length })}
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                disabled={selectedApps.length === 0 || isCreating || isSubmitting}
                onClick={() => setSelectedAppIds(new Set())}
              >
                {t("common.action.discard")}
              </Button>
              <Button
                color="primaryColor"
                size="xs"
                disabled={selectedApps.length === 0 || creating}
                onClick={handleMultiSubmit}
              >
                {t("common.action.add")} ({selectedApps.length})
              </Button>
            </Group>
          </Group>
        </Paper>
      )}
      {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
        <Text component="output" aria-live="polite">
          {innerProps.outcomeLabels[outcome.kind]}
        </Text>
      )}
      {outcome.kind === "reconcileheld" && (
        <Button
          variant="default"
          loading={isSubmitting}
          onClick={() => {
            void retryReconciliation.current?.().catch(() => {});
          }}
        >
          {t("common.action.tryAgain")}
        </Button>
      )}
    </Stack>
  );
};

export const AppSelectModal = createModal<AppSelectModalProps>(AppSelectContent).withOptions({
  defaultTitle: (t: TranslationFunction) => t("app.action.select.title"),
  size: modalSizeSelect,
});

// =========================================================================
// AppCard: Variant 3 (Dashboard Inset) with Medium Title & Large App Icon
// =========================================================================
const AppCard = ({
  app,
  isSelected,
  multiSelectActive,
  onSelect,
}: {
  app: SelectableApp;
  isSelected: boolean;
  multiSelectActive: boolean;
  onSelect: (app: SelectableApp, event?: React.MouseEvent) => void;
}) => {
  const t = useI18n();

  return (
    <SelectableCard
      onClick={(event) => onSelect(app, event)}
      aria-label={app.name}
      selected={isSelected}
      icon={<Image src={app.iconUrl} alt={app.name} w={28} h={28} fit="contain" style={{ flexShrink: 0 }} />}
      title={app.name}
      description={app.description}
      footerLeft={
        <Text size="xs" c="dimmed">
          {multiSelectActive && isSelected ? t("app.action.select.selected") : t("app.action.select.application")}
        </Text>
      }
    />
  );
};
