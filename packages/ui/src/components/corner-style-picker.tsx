"use client";

import type { FocusEventHandler, ReactNode } from "react";
import { useId } from "react";
import { Box, SimpleGrid, Stack, Text } from "@mantine/core";

import type { CornerStyle } from "@homarr/definitions";
import { cornerStyleValues } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { SelectableCard } from "./selectable-card";

export { cornerStyleValues };
export type { CornerStyle };

interface CornerStylePickerProps {
  label: string;
  description?: string;
  value: CornerStyle;
  onChange: (value: CornerStyle) => void;
  onBlur?: FocusEventHandler<HTMLFieldSetElement>;
  onFocus?: FocusEventHandler<HTMLFieldSetElement>;
  id?: string;
  error?: ReactNode;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
  compact?: boolean;
}

export const CornerStylePicker = ({
  label,
  description,
  value,
  onChange,
  onBlur,
  onFocus,
  id,
  error,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  compact = false,
}: CornerStylePickerProps) => {
  const tOptions = useI18n("common.cornerStyle.options");
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy = [ariaDescribedBy];
  if (description) describedBy.push(descriptionId);
  if (error) describedBy.push(errorId);
  const previewHeight = compact ? 24 : 34;

  return (
    <Box
      component="fieldset"
      id={fieldId}
      aria-describedby={describedBy.filter(Boolean).join(" ") || undefined}
      aria-labelledby={ariaLabelledBy}
      aria-invalid={Boolean(error) || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event);
      }}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onFocus?.(event);
      }}
      m={0}
      p={0}
      style={{ border: 0, minWidth: 0 }}
    >
      <Text component="legend" fw={500} size="sm" p={0}>
        {label}
      </Text>
      <Stack gap="xs" mt={2}>
        {description ? (
          <Text id={descriptionId} size="sm" c="dimmed">
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
              aria-label={tOptions(cornerStyle)}
              style={compact ? { minHeight: "auto", height: "auto" } : undefined}
            >
              <Box
                h={previewHeight}
                bg="var(--mantine-color-default-hover)"
                style={{ borderRadius: `var(--mantine-radius-${cornerStyle})` }}
              />
              <Text size="xs" ta="center" mt="xs">
                {tOptions(cornerStyle)}
              </Text>
            </SelectableCard>
          ))}
        </SimpleGrid>
        {error && (
          <Text id={errorId} size="xs" c="red" role="alert">
            {error}
          </Text>
        )}
      </Stack>
    </Box>
  );
};
