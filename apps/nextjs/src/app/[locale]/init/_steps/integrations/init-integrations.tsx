"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Center, Group, Loader, Progress, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { IntegrationMultiSelectGrid } from "~/components/integration/integration-multi-select-grid";

type Phase = "select" | "configure" | "done";

export const InitIntegrations = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedKinds, setSelectedKinds] = useState<IntegrationKind[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useScopedI18n("init.step.integrations");
  const router = useRouter();

  const { mutateAsync: setupIntegrations } = clientApi.onboard.setupIntegrations.useMutation();

  const handleSelectionChange = useCallback((kinds: IntegrationKind[]) => {
    setSelectedKinds(kinds);
  }, []);

  const handleContinueToConfig = () => {
    setCurrentIndex(0);
    setPhase("configure");
  };

  const finishSetupAsync = async () => {
    setPhase("done");
    await setupIntegrations();
    router.refresh();
  };

  const advanceOrFinish = () => {
    if (currentIndex + 1 >= selectedKinds.length) {
      void finishSetupAsync();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const backToSelect = () => {
    setPhase("select");
    setCurrentIndex(0);
  };

  if (phase === "done") {
    return (
      <Card w={64 * 8} maw="90vw" withBorder>
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>{t("configure.finishing")}</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  if (phase === "configure") {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- currentIndex is always within bounds of selectedKinds
    const currentKind = selectedKinds[currentIndex]!;
    const progress = ((currentIndex + 1) / selectedKinds.length) * 100;

    return (
      <Card w={64 * 14} maw="90vw" withBorder>
        <Stack>
          <Stack gap="xs">
            <Group gap="xs" justify="center">
              <IntegrationAvatar kind={currentKind} size="sm" />
              <Text fw={500}>{getIntegrationName(currentKind)}</Text>
            </Group>
            <Progress value={progress} size="sm" />
            <Text size="sm" c="dimmed" ta="center">
              {t("configure.progress", { current: String(currentIndex + 1), total: String(selectedKinds.length) })}
            </Text>
          </Stack>

          <NewIntegrationForm
            key={currentKind}
            kind={currentKind}
            onSuccess={advanceOrFinish}
            onCancel={backToSelect}
            isOnboarding
          />
        </Stack>
      </Card>
    );
  }

  return (
    <Card w={64 * 16} maw="90vw" withBorder>
      <Stack>
        <Text>{t("description")}</Text>

        <IntegrationMultiSelectGrid onSelectionChange={handleSelectionChange} />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => void finishSetupAsync()}>
            {t("action.skip")}
          </Button>
          <Button
            onClick={handleContinueToConfig}
            disabled={selectedKinds.length === 0}
            rightSection={<IconArrowRight size={16} stroke={1.5} />}
          >
            {t("action.continue")} {selectedKinds.length > 0 && `(${selectedKinds.length})`}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};
