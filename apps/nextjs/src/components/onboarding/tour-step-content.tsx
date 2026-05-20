"use client";

import type { ReactNode } from "react";
import { Anchor, Divider, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface TourStepContentProps {
  description: string;
  documentationHref: string;
  icon?: ReactNode;
}

export const TourStepContent = ({ description, documentationHref, icon }: TourStepContentProps) => {
  const t = useI18n();

  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {icon && (
          <ThemeIcon variant="light" size="lg" radius="md" mt={2}>
            {icon}
          </ThemeIcon>
        )}
        <Text size="sm" lh={1.7} style={{ flex: 1 }}>
          {description}
        </Text>
      </Group>
      <Divider />
      <Anchor href={documentationHref} target="_blank" size="xs" fw={500}>
        <Group gap={4} wrap="nowrap">
          <IconExternalLink size={14} />
          {t("onboardingTour.learnMore")}
        </Group>
      </Anchor>
    </Stack>
  );
};
