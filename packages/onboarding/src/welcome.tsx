"use client";

import { useState } from "react";
import { Alert, Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconDatabaseImport } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import type { OnboardingStudioProps } from "./types";
import classes from "./onboarding-studio.module.css";

export const Welcome = ({ environment, sqliteRestore }: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio.welcome");
  const claimT = useScopedI18n("init.studio.claim");
  const [showRestore, setShowRestore] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const start = clientApi.onboard.nextStep.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/init");
    },
    onError() {
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
      setClaimError(error instanceof Error ? error.message : t("errorTitle"));
      return false;
    } finally {
      setClaimPending(false);
    }
  };

  const startOnboardingAsync = async () => {
    if (await claimOnboardingAsync()) await start.mutateAsync();
  };

  const toggleRestoreAsync = async () => {
    if (showRestore) {
      setShowRestore(false);
      return;
    }
    if (await claimOnboardingAsync()) setShowRestore(true);
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
              <Text fw={600} size="lg" ta="center">
                {t("version", { version: environment.version })}
              </Text>
              <Text size="lg" c="dimmed" maw="38rem" ta="center">
                {t("description")}
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
              <Paper id="sqlite-restore-flow" withBorder p="lg" radius="lg" w="100%" maw="38rem">
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
