"use client";

import { Box, SimpleGrid, Stack, Text } from "@mantine/core";

import { SelectableCard } from "./selectable-card";

export const cornerStyleValues = ["xs", "sm", "md", "lg", "xl"] as const;

export type CornerStyle = (typeof cornerStyleValues)[number];

interface CornerStylePickerProps {
  label: string;
  description?: string;
  value: CornerStyle;
  labels: Record<CornerStyle, string>;
  onChange: (value: CornerStyle) => void;
  compact?: boolean;
}

export const CornerStylePicker = ({
  label,
  description,
  value,
  labels,
  onChange,
  compact = false,
}: CornerStylePickerProps) => {
  const previewHeight = compact ? 24 : 34;

  return (
    <Box component="fieldset" m={0} p={0} style={{ border: 0, minWidth: 0 }}>
      <Text component="legend" fw={500} size="sm" p={0}>
        {label}
      </Text>
      <Stack gap="xs" mt={2}>
        {description ? (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        ) : null}
        <SimpleGrid cols={{ base: 3, xs: 5 }} spacing="xs">
          {cornerStyleValues.map((cornerStyle) => (
            <SelectableCard
              key={cornerStyle}
              selected={value === cornerStyle}
              onClick={() => onChange(cornerStyle)}
              radius={cornerStyle}
              p="xs"
              aria-label={labels[cornerStyle]}
              style={compact ? { minHeight: "auto", height: "auto" } : undefined}
            >
              <Box
                h={previewHeight}
                bg="var(--mantine-color-default-hover)"
                style={{ borderRadius: `var(--mantine-radius-${cornerStyle})` }}
              />
              <Text size="xs" ta="center" mt="xs">
                {labels[cornerStyle]}
              </Text>
            </SelectableCard>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
};
