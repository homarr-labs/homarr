"use client";

import { useMemo, useState } from "react";
import { Accordion, Alert, Button, Checkbox, Group, Paper, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { customWidgetPackageSchema, stringifyWidgetJson } from "@homarr/custom-widgets/package";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import { PackageOptionFields } from "@homarr/widgets/custom-api/package-option-fields";

import { AddPackagePlacement, PackagePlacements } from "./_package-placements";
import type { PackageOperation } from "./_package-document";
import { PackageWorkshop } from "./_package-workshop";
import { PackageTransfer } from "./_package-transfer";
import { PackageArtifactReview } from "./_package-artifact-review";
import { PackageConvertedPlacements } from "./_package-converted-placements";
import { downloadPackage } from "./_package-document";

type Installation = RouterOutputs["customWidget"]["package"]["get"];

export function PackageOperations({
  installation,
  initialBoardId,
  source,
  options,
  setOptions,
  dirty,
  trusted,
  onError,
  onMessage,
}: {
  installation?: Installation;
  initialBoardId?: string;
  source?: CustomWidgetPackage;
  options: Record<string, unknown>;
  setOptions(options: Record<string, unknown>): void;
  dirty: boolean;
  trusted: boolean;
  onError(error: string): void;
  onMessage(message: string): void;
}) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const details = clientApi.customWidget.package.get.useQuery(
    { id: installation?.id ?? "" },
    { enabled: Boolean(installation), initialData: installation },
  );
  const current = details.data;
  const matchesReviewedSource = useMemo(() => {
    if (!source) return false;
    const saved = customWidgetPackageSchema.safeParse(current?.source);
    return saved.success && stringifyWidgetJson(saved.data) === stringifyWidgetJson(source);
  }, [current?.source, source]);
  const inspected = clientApi.customWidget.package.inspectArtifact.useQuery(
    { id: installation?.id ?? "" },
    { enabled: Boolean(installation) },
  );
  const activate = clientApi.customWidget.package.activate.useMutation();
  const rollback = clientApi.customWidget.package.rollback.useMutation();
  const enable = clientApi.customWidget.package.setEnabled.useMutation();
  const exported = clientApi.customWidget.package.export.useQuery(
    { id: installation?.id ?? "" },
    { enabled: Boolean(current?.activeArtifactId) },
  );
  const activeSource = useMemo(() => customWidgetPackageSchema.safeParse(exported.data?.source), [exported.data]);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const refresh = async () => {
    await Promise.all([
      utils.customWidget.package.get.invalidate(),
      utils.customWidget.package.list.invalidate(),
      utils.customWidget.package.export.invalidate(),
      utils.customWidget.package.guestGrants.invalidate(),
      utils.customWidget.package.webhooks.invalidate(),
      utils.customWidget.package.inspectArtifact.invalidate(),
      utils.widget.customApi.getData.invalidate(),
    ]);
  };
  const run = async (action: PackageOperation, message: string) => {
    try {
      await action();
      await refresh();
      onMessage(message);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <Stack>
      <Paper withBorder p="md">
        <Stack>
          <Text fw={600}>{t("previewOptions")}</Text>
          {source && <PackageOptionFields schema={source.options} value={options} onChange={setOptions} />}
          <Button variant="subtle" onClick={() => setOptions({})}>
            {t("resetOptions")}
          </Button>
        </Stack>
      </Paper>
      {!current && <Alert>{t("saveFirst")}</Alert>}
      {current && (
        <>
          <Paper withBorder p="md">
            <Stack>
              <Text fw={600}>{t("activation")}</Text>
              <Text size="sm">{t("activationDescription", { count: current.placements.length })}</Text>
              <Text size="xs" ff="monospace" style={{ overflowWrap: "anywhere" }}>
                {t("activeArtifact")}: {current.activeArtifactId ?? t("none")}
              </Text>
              {dirty && <Alert color="yellow">{t("saveBeforeActivate")}</Alert>}
              {!dirty && !matchesReviewedSource && <Alert color="yellow">{t("savedSourceChanged")}</Alert>}
              {inspected.data?.artifact && <PackageArtifactReview artifact={inspected.data.artifact} />}
              {inspected.error && <Alert color="red">{inspected.error.message}</Alert>}
              <Group>
                <Button
                  disabled={dirty || !trusted || !source || !matchesReviewedSource}
                  loading={activate.isPending}
                  onClick={() =>
                    void run(
                      () =>
                        activate.mutateAsync({
                          id: current.id,
                          trusted: true,
                          expectedDraftDigest: current.draftDigest,
                        }),
                      t("activated"),
                    )
                  }
                >
                  {t("activate")}
                </Button>
                {current.activeArtifactId && (
                  <Button
                    variant="default"
                    loading={enable.isPending}
                    onClick={() =>
                      void run(() => enable.mutateAsync({ id: current.id, enabled: !current.enabled }), t("stateSaved"))
                    }
                  >
                    {current.enabled ? t("disable") : t("enable")}
                  </Button>
                )}
                <Button
                  variant="default"
                  disabled={!exported.data}
                  onClick={() => {
                    if (exported.data) downloadPackage(current.name, exported.data);
                  }}
                >
                  {t("exportActive")}
                </Button>
              </Group>
              {current.previousArtifactId && (
                <>
                  <Checkbox
                    checked={rollbackConfirmed}
                    onChange={(event) => setRollbackConfirmed(event.currentTarget.checked)}
                    label={t("rollbackAcknowledgement")}
                  />
                  <Button
                    variant="light"
                    color="orange"
                    disabled={!rollbackConfirmed}
                    loading={rollback.isPending}
                    onClick={() =>
                      void run(
                        () => rollback.mutateAsync({ id: current.id, discardNewerWidgetData: true }),
                        t("rolledBack"),
                      )
                    }
                  >
                    {t("rollback")}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
          <PackageConvertedPlacements
            id={current.id}
            origin={current.origin}
            active={Boolean(current.activeArtifactId && current.enabled)}
            onChange={() => void refresh()}
          />
          {activeSource.success && current.enabled && (
            <AddPackagePlacement
              installation={current}
              initialBoardId={initialBoardId}
              source={activeSource.data}
              onAdded={() => void refresh()}
              onError={onError}
              onMessage={onMessage}
            />
          )}
          {activeSource.success && <PackagePlacements installation={current} source={activeSource.data} />}
          <PackageTransfer
            id={current.id}
            name={current.name}
            active={Boolean(current.activeArtifactId)}
            dirty={dirty}
            onError={onError}
          />
          <PackageWorkshop id={current.id} dirty={dirty} />
          <PackageActivity id={current.id} />
        </>
      )}
    </Stack>
  );
}

function PackageActivity({ id }: { id: string }) {
  const t = useI18n("customWidget.package");
  const activity = clientApi.customWidget.package.activity.useQuery({ id, limit: 20 });
  return (
    <Accordion>
      <Accordion.Item value="activity">
        <Accordion.Control>{t("activity")}</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <Button variant="subtle" size="xs" onClick={() => void activity.refetch()}>
              {t("refresh")}
            </Button>
            {(activity.data ?? []).map((entry) => (
              <Text key={entry.id} size="xs" ff="monospace" style={{ overflowWrap: "anywhere" }}>
                {JSON.stringify(entry)}
              </Text>
            ))}
            {activity.data?.length === 0 && (
              <Text size="sm" c="dimmed">
                {t("noActivity")}
              </Text>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
