import { Group, Loader, Select, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { Modify } from "@homarr/common/types";
import type { GetInputPropsReturnType } from "@homarr/form";

type IntegrationAppSelectProps = Modify<
  GetInputPropsReturnType,
  {
    value?: string | null;
    onChange: (value: string | null) => void;
  }
>;

export const IntegrationAppSelect = ({ value, ...props }: IntegrationAppSelectProps) => {
  const { data, isPending } = clientApi.app.selectable.useQuery();

  const appMap = new Map(data?.map((app) => [app.id, app] as const));

  return (
    <Select
      withAsterisk
      label="Select existing app"
      searchable
      clearable
      leftSection={
        value ? <img width={20} height={20} src={appMap.get(value)?.iconUrl} alt={appMap.get(value)?.name} /> : null
      }
      renderOption={({ option, checked }) => (
        <Group flex="1" gap="xs">
          <img width={20} height={20} src={appMap.get(option.value)?.iconUrl} alt={option.label} />
          <Stack gap={0}>
            <Text>{option.label}</Text>
            <Text size="xs" c="dimmed">
              {appMap.get(option.value)?.href}
            </Text>
          </Stack>
          {checked && (
            <IconCheck
              style={{ marginInlineStart: "auto" }}
              stroke={1.5}
              color="currentColor"
              opacity={0.6}
              size={18}
            />
          )}
        </Group>
      )}
      {...props}
      data={data?.map((app) => ({ value: app.id, label: app.name }))}
      rightSection={isPending ? <Loader size="sm" /> : null}
    />
  );
};
