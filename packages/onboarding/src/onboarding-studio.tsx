"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Alert, Button, Center, Paper, Stack, Text, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { OnboardingStudioProps } from "./types";
import { AccountSetup } from "./account";
import { getOnboardingAccessState } from "./claim-state";
import { Finish } from "./finish";
import { SetupStudio } from "./setup-studio";
import { Welcome } from "./welcome";

type ClaimState = "checking" | "ready" | "locked" | "signIn" | "error";

const getInitialClaimState = (accessState: ReturnType<typeof getOnboardingAccessState>): ClaimState => {
  if (accessState === "claim") return "checking";
  return accessState;
};

export const OnboardingStudio = (props: OnboardingStudioProps) => {
  const t = useI18n("init.studio.claim");
  const tCommon = useI18n("common.action");
  const accessState = getOnboardingAccessState(props.environment);
  const [claimState, setClaimState] = useState<ClaimState>(() => getInitialClaimState(accessState));
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
    let title = t("errorTitle");
    let description = claimError ?? t("errorDescription");
    let action: ReactNode = (
      <Stack align="center">
        <Alert color="red" role="alert">
          {description}
        </Alert>
        <Button onClick={() => window.location.reload()}>{tCommon("tryAgain")}</Button>
      </Stack>
    );

    switch (claimState) {
      case "checking":
        title = t("checkingTitle");
        description = t("checking");
        action = null;
        break;
      case "signIn":
        title = t("signInTitle");
        description = t("signInDescription");
        action = (
          <Button component={Link} href="/auth/login?callbackUrl=%2Finit">
            {t("signIn")}
          </Button>
        );
        break;
      case "locked":
        title = t("lockedTitle");
        description = t("lockedDescription");
        action = <Button onClick={() => window.location.reload()}>{tCommon("tryAgain")}</Button>;
        break;
      case "error":
        break;
    }

    return (
      <Center mih="100dvh" p="md">
        <Paper withBorder radius="lg" p="xl" maw="32rem" w="100%">
          <Stack align="center">
            <Title order={1} size="h2" ta="center">
              {title}
            </Title>
            <Text c="dimmed" ta="center">
              {description}
            </Text>
            {action}
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
