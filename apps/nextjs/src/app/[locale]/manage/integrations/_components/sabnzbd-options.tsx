"use client";

import { Checkbox, Fieldset, Input, SegmentedControl, Stack } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { SABNZBD_HISTORY_WINDOW_OPTIONS } from "./integration-kind-options.types";
import type { SabnzbdHistoryWindowDays, SabnzbdOptionsModel } from "./integration-kind-options.types";

interface SabnzbdOptionsProps {
  value: SabnzbdOptionsModel;
  onChange: (value: SabnzbdOptionsModel) => void;
}

export const SabnzbdOptions = ({ value, onChange }: SabnzbdOptionsProps) => {
  const t = useI18n();

  return (
    <Fieldset legend={t("integration.field.sabnzbdHistory.title")}>
      <Stack gap="sm">
        <Checkbox
          checked={value.includeArchivedHistory}
          label={t("integration.field.sabnzbdHistory.includeArchivedHistory.label")}
          description={t("integration.field.sabnzbdHistory.includeArchivedHistory.description")}
          onChange={(event) =>
            onChange({
              ...value,
              includeArchivedHistory: event.currentTarget.checked,
            })
          }
        />

        <Input.Wrapper label={t("integration.field.sabnzbdHistory.historyWindowDays.label")}>
          <SegmentedControl
            value={value.historyWindowDays.toString()}
            disabled={!value.includeArchivedHistory}
            data={SABNZBD_HISTORY_WINDOW_OPTIONS.map((days) => ({
              label: t("integration.field.sabnzbdHistory.historyWindowDays.option", { days }),
              value: days.toString(),
            }))}
            onChange={(days) =>
              onChange({
                ...value,
                historyWindowDays: Number(days) as SabnzbdHistoryWindowDays,
              })
            }
          />
        </Input.Wrapper>
      </Stack>
    </Fieldset>
  );
};
