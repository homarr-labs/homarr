"use client";

import { Anchor, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { HomarrDocumentationPath } from "@homarr/definitions";
import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

interface TourStepContentProps {
  description: string;
  docPath: HomarrDocumentationPath;
  docHash?: `#${string}`;
}

export const TourStepContent = ({ description, docPath, docHash }: TourStepContentProps) => {
  const t = useI18n();

  return (
    <Stack gap="xs">
      <Text size="sm">{description}</Text>
      <Anchor href={createDocumentationLink(docPath, docHash)} target="_blank" size="xs" c="dimmed">
        <IconExternalLink size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
        {t("onboardingTour.learnMore")}
      </Anchor>
    </Stack>
  );
};
