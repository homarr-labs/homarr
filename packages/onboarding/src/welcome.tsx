"use client";

import { useState } from "react";
import { Alert, Badge, Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconDatabaseImport, IconLayoutDashboard, IconSparkles } from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { OnboardingStudioProps } from "./types";
import classes from "./onboarding-studio.module.css";

export const Welcome = ({ environment, sqliteRestore }: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio.welcome");
  const claimT = useScopedI18n("init.studio.claim");
  const reduceMotion = useReducedMotion();
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
      <div className={classes.shell}>
        <Group className={classes.topbar} justify="space-between">
          <motion.img
            src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg"
            alt="Homarr"
            className={classes.wordmark}
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          />
          <Badge variant="light" size="lg">
            {t("badge")}
          </Badge>
        </Group>

        <section className={classes.hero} aria-labelledby="onboarding-welcome-title">
          <Stack gap="xl" align="flex-start">
            <Stack gap="md">
              <Text c="dimmed" fw={650} size="sm">
                {t("eyebrow")}
              </Text>
              <Title id="onboarding-welcome-title" className={classes.heroTitle}>
                {t("title")}
              </Title>
              <Text size="lg" c="dimmed" maw="38rem">
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

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            <Paper className={classes.heroPanel} radius="lg" p="xl">
              <div className={classes.orbit} aria-hidden>
                {[IconLayoutDashboard, IconSparkles, IconDatabaseImport, IconLayoutDashboard].map((Icon, index) => (
                  <motion.div
                    key={index}
                    className={classes.orbitItem}
                    animate={reduceMotion ? undefined : { y: [0, index % 2 === 0 ? -6 : 6, 0] }}
                    transition={{ duration: 3.4 + index * 0.35, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Icon size={22} />
                  </motion.div>
                ))}
              </div>
              <Stack h="100%" justify="space-between" pos="relative">
                <Badge variant="dot" color="green">
                  {t("ready")}
                </Badge>
                <Stack gap={4} align="center">
                  <ThemeIcon size={72} radius="xl" variant="light">
                    <IconLayoutDashboard size={34} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    {t("panelTitle")}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" maw="19rem">
                    {t("panelDescription")}
                  </Text>
                </Stack>
                <Group gap="xs" justify="center">
                  <Badge variant="light">{t("chipDiscover")}</Badge>
                  <Badge variant="light">{t("chipConnect")}</Badge>
                  <Badge variant="light">{t("chipBuild")}</Badge>
                </Group>
              </Stack>
            </Paper>
          </motion.div>
        </section>
      </div>
    </main>
  );
};
