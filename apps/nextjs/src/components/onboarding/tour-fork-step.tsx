"use client";

import { Anchor, Button, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { HomarrDocumentationPath } from "@homarr/definitions";
import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

interface TourForkStepProps {
  question: string;
  description?: string;
  docPath: HomarrDocumentationPath;
  onYes: () => void;
  onNo: () => void;
}

export const TourForkStep = ({ question, description, docPath, onYes, onNo }: TourForkStepProps) => {
  const t = useI18n();

  return (
    <Stack gap="sm">
      {description && <Text size="sm">{description}</Text>}
      <Text size="sm" fw={500}>
        {question}
      </Text>
      <Group gap="sm">
        <Button size="xs" onClick={onYes}>
          {t("onboardingTour.forkYes")}
        </Button>
        <Button size="xs" variant="light" onClick={onNo}>
          {t("onboardingTour.forkNo")}
        </Button>
      </Group>
      <Anchor href={createDocumentationLink(docPath)} target="_blank" size="xs" c="dimmed">
        <IconExternalLink size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
        {t("onboardingTour.learnMore")}
      </Anchor>
    </Stack>
  );
};
