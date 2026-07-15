import { SimpleGrid, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import {
  Icon123,
  IconActivityHeartbeat,
  IconBraces,
  IconCode,
  IconHash,
  IconLayoutGrid,
  IconListDetails,
  IconPointer,
  IconProgress,
  IconTable,
} from "@tabler/icons-react";
import type { useScopedI18n } from "@homarr/translation/client";
import type { CustomWidgetDisplayType } from "@homarr/custom-widgets/core";
import { customWidgetDisplayDescriptors } from "@homarr/custom-widgets/core";

import { BasicDisplayFields } from "./_display-fields-basic";
import { CustomJsxDisplayFields } from "./_display-fields-jsx";
import { MetricDisplayFields } from "./_display-fields-metric";
import { StatusDisplayFields } from "./_display-fields-status";
import type { DisplayFieldsProps } from "./_display-field-types";
import classes from "./_custom-widget-form.module.css";

export const DISPLAY_TYPE_ICONS = {
  number: Icon123,
  keyValue: IconListDetails,
  table: IconTable,
  grid: IconLayoutGrid,
  progress: IconProgress,
  status: IconActivityHeartbeat,
  count: IconHash,
  json: IconBraces,
  action: IconPointer,
  code: IconCode,
} as const;

export function DisplayTypePicker({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: CustomWidgetDisplayType) => void;
  t: ReturnType<typeof useScopedI18n<"customWidget">>;
}) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
      {customWidgetDisplayDescriptors.map((descriptor) => {
        const displayType = descriptor.type;
        const Icon = DISPLAY_TYPE_ICONS[descriptor.icon];
        const selected = value === displayType;
        return (
          <UnstyledButton
            type="button"
            key={displayType}
            className={classes.displayTypeOption}
            data-selected={selected || undefined}
            onClick={() => onChange(displayType)}
            aria-pressed={selected}
          >
            <ThemeIcon variant={selected ? "filled" : "light"} size={42} radius="md">
              <Icon size={22} />
            </ThemeIcon>
            <div className={classes.displayTypeCopy}>
              <Text fw={600} size="sm">
                {t(`displayType.${displayType}` as never)}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={3}>
                {t(`displayTypeDescription.${displayType}` as never)}
              </Text>
            </div>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}

export function DisplayTypeFields(props: DisplayFieldsProps) {
  return (
    <>
      <BasicDisplayFields {...props} />
      <MetricDisplayFields {...props} />
      <StatusDisplayFields {...props} />
      <CustomJsxDisplayFields {...props} />
    </>
  );
}
