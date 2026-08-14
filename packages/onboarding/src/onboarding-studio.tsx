"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Center, Paper, Stack, Text, Title } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { OnboardingStudioProps } from "./types";
import { AccountSetup } from "./account";
import { getOnboardingAccessState } from "./claim-state";
import { Finish } from "./finish";
import { SetupStudio } from "./setup-studio";
import { Welcome } from "./welcome";

export const OnboardingStudio = (props: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio.claim");
  const tCommon = useScopedI18n("common.action");
  const accessState = getOnboardingAccessState(props.environment);
  const [claimState, setClaimState] = useState<"checking" | "ready" | "locked" | "signIn" | "error">(
    accessState === "claim" ? "checking" : accessState,
  );
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (accessState !== "claim") {
      setClaimState(accessState);
      return;
    }

    const controller = new AbortController();
    void fetch("/api/onboarding/claim", { method: "POST", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          setClaimState("ready");
          return;
        }
        const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
        if (body?.code === "locked") {
          setClaimState("locked");
          return;
        }
        if (body?.code === "administrator_required") {
          setClaimState("signIn");
          return;
        }
        setClaimError(t("errorDescription"));
        setClaimState("error");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setClaimError(t("errorDescription"));
        setClaimState("error");
      });
    return () => controller.abort();
  }, [accessState, t]);

  if (claimState !== "ready") {
    const signIn = claimState === "signIn";
    return (
      <Center mih="100dvh" p="md">
        <Paper withBorder radius="lg" p="xl" maw="32rem" w="100%">
          <Stack align="center">
            <Title order={1} size="h2" ta="center">
              {claimState === "checking"
                ? t("checkingTitle")
                : signIn
                  ? t("signInTitle")
                  : claimState === "locked"
                    ? t("lockedTitle")
                    : t("errorTitle")}
            </Title>
            <Text c="dimmed" ta="center">
              {signIn
                ? t("signInDescription")
                : claimState === "locked"
                  ? t("lockedDescription")
                  : claimState === "checking"
                    ? t("checking")
                    : (claimError ?? t("errorDescription"))}
            </Text>
            {signIn ? (
              <Button component={Link} href="/auth/login?callbackUrl=%2Finit">
                {t("signIn")}
              </Button>
            ) : claimState === "locked" ? (
              <Button onClick={() => window.location.reload()}>{tCommon("tryAgain")}</Button>
            ) : claimState === "error" ? (
              <Stack align="center">
                <Alert color="red" role="alert">
                  {claimError ?? t("errorDescription")}
                </Alert>
                <Button onClick={() => window.location.reload()}>{tCommon("tryAgain")}</Button>
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      </Center>
    );
  }

  switch (props.environment.currentStep) {
    case "start":
      return <Welcome {...props} />;
    case "user":
    case "group":
      return <AccountSetup {...props} />;
    case "setup":
      return <SetupStudio {...props} />;
    case "finish":
      return <Finish {...props} />;
  }
};
