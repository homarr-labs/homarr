"use client";

import { memo, useMemo } from "react";
import type { SelectProps } from "@mantine/core";
import { Group, Loader, Select } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetAppInput = ({ property, kind, options }: CommonWidgetInputProps<"app">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { data: apps, isPending } = clientApi.app.selectable.useQuery();

  const currentApp = useMemo(
    () => apps?.find((app) => app.id === form.values.options.appId),
    [apps, form.values.options.appId],
  );

  return (
    <Select
      label={t("label")}
      searchable
      limit={10}
      leftSection={<MemoizedLeftSection isPending={isPending} currentApp={currentApp} />}
      renderOption={renderSelectOption}
      data={
        apps?.map((app) => ({
          label: app.name,
          value: app.id,
          iconUrl: app.iconUrl,
        })) ?? []
      }
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: 18,
};

const renderSelectOption: SelectProps["renderOption"] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    {"iconUrl" in option && typeof option.iconUrl === "string" ? (
      <img width={20} height={20} src={option.iconUrl} alt={option.label} />
    ) : null}
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />}
  </Group>
);

interface LeftSectionProps {
  isPending: boolean;
  currentApp: RouterOutputs["app"]["selectable"][number] | undefined;
}

const size = 20;
const LeftSection = ({ isPending, currentApp }: LeftSectionProps) => {
  if (isPending) {
    return <Loader size={size} />;
  }

  if (currentApp) {
    return <img width={size} height={size} src={currentApp.iconUrl} alt={currentApp.name} />;
  }

  return null;
};

const MemoizedLeftSection = memo(LeftSection);
