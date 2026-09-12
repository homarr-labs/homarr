"use client";

import { useState } from "react";
import { Alert, Button, Paper, Select, Stack, Text } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

export function PackageConvertedPlacements({
  id,
  origin,
  active,
  onChange,
}: {
  id: string;
  origin: string | null;
  active: boolean;
  onChange(): void;
}) {
  let definitionId: string | undefined;
  try {
    const value: unknown = JSON.parse(origin ?? "null");
    if (isRecord(value) && value.kind === "converted-v2" && typeof value.definitionId === "string")
      definitionId = value.definitionId;
  } catch {
    /* Other package origins have no legacy placement migration. */
  }
  if (!definitionId) return null;
  return <ConvertedPlacementPicker id={id} definitionId={definitionId} active={active} onChange={onChange} />;
}

function ConvertedPlacementPicker({
  id,
  definitionId,
  active,
  onChange,
}: {
  id: string;
  definitionId: string;
  active: boolean;
  onChange(): void;
}) {
  const t = useI18n("customWidget.package.conversion");
  const placements = clientApi.customWidget.package.legacyPlacements.useQuery({ definitionId }, { enabled: active });
  const migrate = clientApi.customWidget.package.migrateV2Placement.useMutation();
  const [itemId, setItemId] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={600}>{t("replaceTitle")}</Text>
        <Text size="sm">{t("replaceDescription")}</Text>
        {!active && (
          <Text size="sm" c="dimmed">
            {t("activateFirst")}
          </Text>
        )}
        {active && (
          <>
            <Select
              label={t("choosePlacement")}
              searchable
              value={itemId}
              onChange={(value) => {
                setItemId(value);
                setReplaced(false);
              }}
              data={(placements.data ?? []).map((placement) => ({
                value: placement.id,
                label: `${placement.boardName} · ${placement.id}`,
              }))}
            />
            {placements.data?.length === 0 && (
              <Text size="sm" c="dimmed">
                {t("noOriginalPlacements")}
              </Text>
            )}
            <Button
              disabled={!itemId}
              loading={migrate.isPending}
              onClick={() => {
                if (!itemId) return;
                migrate.mutate(
                  { id, itemId, definitionId },
                  {
                    onSuccess: () => {
                      setItemId(null);
                      setReplaced(true);
                      void placements.refetch();
                      onChange();
                    },
                  },
                );
              }}
            >
              {t("replaceSelected")}
            </Button>
          </>
        )}
        {replaced && <Alert color="green">{t("replaced")}</Alert>}
        {(migrate.error || placements.error) && (
          <Alert color="red">{migrate.error?.message ?? placements.error?.message}</Alert>
        )}
      </Stack>
    </Paper>
  );
}
