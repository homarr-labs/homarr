"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Center, Loader, Paper, Stack, Text, Title } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { OnboardingStudioProps } from "./types";
import { AccountSetup } from "./account";
import { Finish } from "./finish";
import { SetupStudio } from "./setup-studio";
import { Welcome } from "./welcome";

export const OnboardingStudio = (props: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio.claim");
  const tCommon = useScopedI18n("common.action");
  const [claimState, setClaimState] = useState<"checking" | "ready" | "locked" | "signIn" | "error">(
    props.environment.currentStep === "start" || props.environment.currentStep === "finish" ? "ready" : "checking",
  );
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (props.environment.currentStep === "start" || props.environment.currentStep === "finish") return;
    if (props.environment.canConfigurePrivileged) {
      setClaimState("ready");
      return;
    }
    if (
      props.environment.hasUsers ||
      (props.environment.externalAuthEnabled && props.environment.currentStep === "setup")
    ) {
      setClaimState("signIn");
      return;
    }

    const controller = new AbortController();
    void fetch("/api/onboarding/claim", { method: "POST", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          setClaimState("ready");
          return;
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setClaimError(body?.error ?? t("errorDescription"));
        setClaimState(response.status === 423 ? "locked" : response.status === 403 ? "signIn" : "error");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setClaimError(error instanceof Error ? error.message : t("errorDescription"));
        setClaimState("error");
      });
    return () => controller.abort();
  }, [
    props.environment.canConfigurePrivileged,
    props.environment.currentStep,
    props.environment.externalAuthEnabled,
    props.environment.hasUsers,
    t,
  ]);

  if (claimState !== "ready") {
    const signIn = claimState === "signIn";
    return (
      <Center mih="100dvh" p="md">
        <Paper withBorder radius="lg" p="xl" maw="32rem" w="100%">
          <Stack align="center">
            {claimState === "checking" ? <Loader aria-label={t("checking")} /> : null}
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
