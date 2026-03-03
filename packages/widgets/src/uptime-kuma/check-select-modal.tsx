"use client";

import { memo, useState } from "react";
import type { SelectProps } from "@mantine/core";
import { Button, Group, Loader, Select, Stack } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { UptimeKumaCheck } from "@homarr/integrations/types";
import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface InnerProps {
  integrationIds: string[];
  presentIds: number[];
  onSelect: (check: UptimeKumaCheck) => void | Promise<void>;
}

interface FormType {
  id: number | "";
}

export const UptimeKumaCheckSelectModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const { data: responses, isPending } = clientApi.widget.uptimeKuma.checks.useQuery(
    { integrationIds: innerProps.integrationIds },
    { enabled: innerProps.integrationIds.length > 0 },
  );
  const checks = responses?.flatMap((r) => r.checks) ?? [];
  const [loading, setLoading] = useState(false);
  const form = useForm<FormType>({
    initialValues: { id: "" },
  });

  const handleSubmitAsync = async (values: FormType) => {
    const check = checks.find((c) => c.id === Number(values.id));
    if (!check) return;
    setLoading(true);
    await innerProps.onSelect(check);
    setLoading(false);
    actions.closeModal();
  };

  const current = checks.find((c) => c.id === Number(form.values.id));

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack>
        <Select
          {...form.getInputProps("id")}
          label={t("widget.uptimeKuma.option.checkIds.label")}
          searchable
          clearable
          leftSection={<MemoizedLeftSection isPending={isPending} current={current} />}
          nothingFoundMessage={t("widget.uptimeKuma.option.checkIds.noResults")}
          renderOption={renderOption}
          data={checks
            .filter((c) => !innerProps.presentIds.includes(c.id))
            .map((c) => ({ label: c.name, value: c.id.toString() }))}
        />
        <Group justify="end">
          <Button variant="default" onClick={actions.closeModal}>
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={loading} disabled={!current}>
            {t("common.action.add")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("widget.uptimeKuma.option.checkIds.add"),
});

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: 18,
};

const renderOption: SelectProps["renderOption"] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />}
  </Group>
);

interface LeftSectionProps {
  isPending: boolean;
  current: UptimeKumaCheck | undefined;
}

const size = 20;
const LeftSection = ({ isPending, current }: LeftSectionProps) => {
  if (isPending) {
    return <Loader size={size} />;
  }
  return null;
};

const MemoizedLeftSection = memo(LeftSection);
