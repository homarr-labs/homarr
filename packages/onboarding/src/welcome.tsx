"use client";

import { useRef, useState } from "react";
import { Alert, Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconDatabaseImport } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import type { OnboardingStudioProps } from "./types";
import { useOnboardingSounds, useWelcomeSound } from "./use-onboarding-sounds";
import classes from "./onboarding-studio.module.css";

export const Welcome = ({ environment, sqliteRestore }: OnboardingStudioProps) => {
  const t = useI18n("init.studio.welcome");
  const claimT = useI18n("init.studio.claim");
  const [showRestore, setShowRestore] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const sounds = useOnboardingSounds();
  const welcomeSound = useWelcomeSound();
  const welcomeSoundPlayed = useRef(false);
  const start = clientApi.onboard.nextStep.useMutation({
    async onSuccess() {
      sounds.swoosh();
      await revalidatePathActionAsync("/init");
    },
    onError() {
      sounds.error();
      showErrorNotification({ title: t("errorTitle"), message: t("errorDescription") });
    },
  });

  const getClaimError = (code: unknown) => {
    switch (code) {
      case "finished":
      case "unavailable":
      case "cross_site":
        return claimT("errorDescription");
      case "administrator_required":
        return claimT("signInDescription");
      case "locked":
        return claimT("lockedDescription");
      default:
        return t("errorDescription");
    }
  };

  const claimOnboardingAsync = async () => {
    setClaimPending(true);
    setClaimError(null);
    try {
      const response = await fetch("/api/onboarding/claim", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
        throw new Error(getClaimError(body?.code));
      }
      return true;
    } catch (error) {
      sounds.error();
      setClaimError(error instanceof Error ? error.message : t("errorTitle"));
      return false;
    } finally {
      setClaimPending(false);
    }
  };

  const startOnboardingAsync = async () => {
    if (!welcomeSoundPlayed.current) {
      welcomeSoundPlayed.current = true;
      welcomeSound.notify();
    } else sounds.click();
    if (await claimOnboardingAsync()) await start.mutateAsync();
  };

  const toggleRestoreAsync = async () => {
    const playedWelcomeSound = !welcomeSoundPlayed.current;
    if (playedWelcomeSound) {
      welcomeSoundPlayed.current = true;
      welcomeSound.notify();
    }
    if (showRestore) {
      if (!playedWelcomeSound) sounds.toggle(false);
      setShowRestore(false);
      return;
    }
    if (await claimOnboardingAsync()) {
      if (!playedWelcomeSound) sounds.toggle(true);
      setShowRestore(true);
    }
  };

  return (
    <main className={classes.page}>
      <OnboardingBackdrop />
      <div className={classes.shell}>
        <section className={classes.hero} aria-labelledby="onboarding-welcome-title">
          <Stack gap="xl" align="center">
            <OnboardingWordmark large />
            <Stack gap="sm" align="center">
              <Title id="onboarding-welcome-title" className={classes.heroTitle} ta="center">
                {t("title")}
              </Title>
              <Text size="lg" c="dimmed" maw="38rem" ta="center">
                {t("description", { version: environment.version })}
              </Text>
            </Stack>

            <Group className={classes.primaryActions} gap="sm">
              <Button
                size="lg"
                rightSection={<IconArrowRight size={18} />}
                loading={start.isPending || claimPending}
                onClick={() => void startOnboardingAsync()}
              >
                {t("start")}
              </Button>
              {environment.databaseDriver === "sqlite" && sqliteRestore ? (
                <Button
                  size="lg"
                  variant="default"
                  leftSection={<IconDatabaseImport size={18} />}
                  onClick={() => void toggleRestoreAsync()}
                  loading={claimPending}
                  aria-expanded={showRestore}
                  aria-controls="sqlite-restore-flow"
                >
                  {t("restore")}
                </Button>
              ) : null}
            </Group>

            {showRestore && sqliteRestore ? (
              <Paper id="sqlite-restore-flow" withBorder p="lg" radius="lg" w="100%" maw="56rem">
                <Stack>
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="orange">
                      <IconDatabaseImport size={18} />
                    </ThemeIcon>
                    <Text fw={650}>{t("restoreTitle")}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t("restoreDescription")}
                  </Text>
                  {sqliteRestore}
                </Stack>
              </Paper>
            ) : null}

            {claimError || start.error ? (
              <Alert color="red" title={t("errorTitle")} maw="38rem">
                {claimError ?? t("errorDescription")}
              </Alert>
            ) : null}
          </Stack>
        </section>
      </div>
    </main>
  );
};
