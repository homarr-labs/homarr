"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Center, Group, Loader, Stack, Stepper, Text } from "@mantine/core";
import { IconArrowRight, IconBook2, IconCheck, IconLayoutDashboard, IconMailForward } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getMantineColor } from "@homarr/common";
import type { IntegrationKind } from "@homarr/definitions";
import { createDocumentationLink, getIntegrationName } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { IntegrationAvatar, Link } from "@homarr/ui";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { IntegrationMultiSelectGrid } from "~/components/integration/integration-multi-select-grid";

type Phase = "select" | "configure" | "done";

export const InitIntegrations = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedKinds, setSelectedKinds] = useState<IntegrationKind[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useScopedI18n("init.step.integrations");

  const { mutateAsync: setupIntegrations } = clientApi.onboard.setupIntegrations.useMutation();

  const handleSelectionChange = useCallback((kinds: IntegrationKind[]) => {
    setSelectedKinds(kinds);
  }, []);

  const handleContinueToConfig = () => {
    setCurrentIndex(0);
    setPhase("configure");
  };

  const handleSkipAll = () => {
    setPhase("done");
  };

  const advanceOrFinish = () => {
    if (currentIndex + 1 >= selectedKinds.length) {
      setPhase("done");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const backToSelect = () => {
    setPhase("select");
    setCurrentIndex(0);
  };

  if (phase === "done") {
    return <FinishingPhase setupIntegrations={setupIntegrations} />;
  }

  if (phase === "configure") {
    const currentKind = selectedKinds[currentIndex];
    if (currentKind === undefined) {
      return (
        <Card w={64 * 14} maw="90vw" withBorder>
          <Center py="xl">
            <Loader />
          </Center>
        </Card>
      );
    }

    return (
      <Card w={64 * 14} maw="90vw" withBorder>
        <Stack>
          <Stepper active={currentIndex} size="sm" styles={{ stepIcon: { borderWidth: 0 } }}>
            {selectedKinds.map((kind, index) => (
              <Stepper.Step
                key={kind}
                icon={<IntegrationAvatar kind={kind} size="sm" />}
                completedIcon={<IconCheck size={14} />}
                label={index === currentIndex ? getIntegrationName(kind) : undefined}
              />
            ))}
          </Stepper>

          <Text size="sm" c="dimmed" ta="center">
            {t("configure.progress", { current: String(currentIndex + 1), total: String(selectedKinds.length) })}
          </Text>

          <NewIntegrationForm
            key={currentKind}
            kind={currentKind}
            onSuccess={advanceOrFinish}
            onCancel={backToSelect}
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
          <Button variant="subtle" onClick={handleSkipAll}>
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

const FinishingPhase = ({ setupIntegrations }: { setupIntegrations: () => Promise<void> }) => {
  const t = useScopedI18n("init.step");
  const [isReady, setIsReady] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    void setupIntegrations().then(() => {
      setIsReady(true);
    });
  }, [setupIntegrations]);

  if (!isReady) {
    return (
      <Card w={64 * 8} maw="90vw" withBorder>
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>{t("integrations.configure.finishing")}</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  return (
    <Card w={64 * 8} maw="90vw" withBorder>
      <Stack>
        <Stack gap={4} align="center">
          <IconCheck size={48} color={getMantineColor("green", 6)} />
          <Text fw={500} size="lg">
            {t("finish.title")}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {t("finish.description")}
          </Text>
        </Stack>

        <Button
          variant="default"
          component={Link}
          href="/auth/login?callbackUrl=/boards/dashboard"
          leftSection={<IconLayoutDashboard color={getMantineColor("blue", 6)} size={16} stroke={1.5} />}
        >
          {t("finish.action.goToBoard", { name: "dashboard" })}
        </Button>

        <Button
          variant="default"
          component={Link}
          href="/auth/login?callbackUrl=/manage/users/invites"
          leftSection={<IconMailForward color={getMantineColor("pink", 6)} size={16} stroke={1.5} />}
        >
          {t("finish.action.inviteUser")}
        </Button>

        <Button
          variant="default"
          component="a"
          href={createDocumentationLink("/docs/getting-started/after-the-installation")}
          leftSection={<IconBook2 color={getMantineColor("yellow", 6)} size={16} stroke={1.5} />}
        >
          {t("finish.action.docs")}
        </Button>
      </Stack>
    </Card>
  );
};
