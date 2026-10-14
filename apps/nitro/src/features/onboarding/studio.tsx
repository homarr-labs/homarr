import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Center, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";

import { AccountSetup } from "./account";
import { claimOnboarding } from "./claim";
import type { ClaimResult } from "./claim";
import { onboardingError } from "./errors";
import { useOnboardingRead } from "./native-read";
import { SetupStudio } from "./setup-studio";
import { authorityHold } from "./types";
import type { OnboardingProps } from "./types";

type ClaimState =
  | Exclude<ClaimResult, { kind: "ready" }>
  | { kind: "ready"; expiresAt?: number }
  | { kind: "checking" | "expired" | "unsupported" };

export type OnboardingFrontendProps<Kind extends string, Secret extends string, Locale extends string> =
  | { kind: "unsupported" }
  | ({ kind: "source-snapshot" } & OnboardingProps<Kind, Secret, Locale>);

export function OnboardingFrontend<Kind extends string, Secret extends string, Locale extends string>(
  props: OnboardingFrontendProps<Kind, Secret, Locale>,
) {
  if (props.kind === "unsupported") {
    return (
      <Center mih="100dvh" p="md">
        <Alert color="yellow" maw="42rem" role="alert">
          {authorityHold}
        </Alert>
      </Center>
    );
  }
  return <OnboardingStudio {...props} />;
}

export function OnboardingStudio<Kind extends string, Secret extends string, Locale extends string>(
  props: OnboardingProps<Kind, Secret, Locale>,
) {
  const { source, client } = props;
  const t = source.t;
  const Wordmark = source.OnboardingWordmark;
  const Backdrop = source.presentation.Backdrop;
  const Link = source.presentation.Link;
  const currentStep = source.normalizeOnboardingStep(props.environment.currentStep);
  const environment = { ...props.environment, currentStep };
  const access = source.getOnboardingAccessState(environment);
  const [attempt, setAttempt] = useState(0);
  const [claim, setClaim] = useState<ClaimState>(() =>
    access === "claim" ? { kind: "checking" } : access === "signIn" ? { kind: "signIn" } : { kind: "ready" },
  );
  const readStep = useCallback((signal: AbortSignal) => client.onboard.currentStep(undefined, { signal }), [client]);
  const step = useOnboardingRead(readStep);
  const onAuthorityFailure = useCallback(() => setClaim({ kind: "error" }), []);

  useEffect(() => {
    if (access === "signIn") {
      setClaim({ kind: "signIn" });
      return;
    }
    if (access === "ready") {
      setClaim({ kind: "ready" });
      return;
    }
    if (props.claimTransport === "unsupported") {
      setClaim({ kind: "unsupported" });
      return;
    }
    const controller = new AbortController();
    setClaim({ kind: "checking" });
    void claimOnboarding(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setClaim(result);
      },
      () => {
        if (!controller.signal.aborted) setClaim({ kind: "error" });
      },
    );
    return () => controller.abort();
  }, [access, props.claimTransport, attempt]);

  useEffect(() => {
    if (claim.kind !== "ready" || claim.expiresAt === undefined) return;
    const expiresAt = claim.expiresAt;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setClaim({ kind: "expired" });
        return;
      }
      timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check();
    return () => clearTimeout(timer);
  }, [claim]);

  const gate: ClaimState =
    access === "signIn"
      ? { kind: "signIn" }
      : access === "claim" && props.claimTransport === "unsupported"
        ? { kind: "unsupported" }
        : access === "claim" && claim.kind === "ready" && claim.expiresAt === undefined
          ? { kind: "checking" }
          : claim.kind === "ready" && claim.expiresAt !== undefined && claim.expiresAt <= Date.now()
            ? { kind: "expired" as const }
            : claim;
  if (gate.kind !== "ready") {
    const title =
      gate.kind === "checking"
        ? t("init.studio.claim.checkingTitle")
        : gate.kind === "signIn"
          ? t("init.studio.claim.signInTitle")
          : gate.kind === "locked"
            ? t("init.studio.claim.lockedTitle")
            : t("init.studio.claim.errorTitle");
    const description =
      gate.kind === "checking"
        ? t("init.studio.claim.checking")
        : gate.kind === "signIn"
          ? t("init.studio.claim.signInDescription")
          : gate.kind === "locked"
            ? t("init.studio.claim.lockedDescription")
            : gate.kind === "unsupported"
              ? source.holds.authority
              : gate.kind === "expired"
                ? source.holds.expired
                : t("init.studio.claim.errorDescription");
    return (
      <Center mih="100dvh" p="md">
        <Paper withBorder p="xl" radius="lg" maw="36rem" w="100%">
          <Stack>
            <Title order={1} size="h2">
              {title}
            </Title>
            {gate.kind === "checking" ? (
              <Text component="output">{description}</Text>
            ) : (
              <Alert color={gate.kind === "locked" || gate.kind === "unsupported" ? "yellow" : "red"} role="alert">
                {description}
              </Alert>
            )}
            {gate.kind === "locked" && gate.expiresAt !== undefined ? (
              <Text size="sm">{formatExpiry(gate.expiresAt)}</Text>
            ) : null}
            {gate.kind === "checking" ? (
              <Skeleton height={44} />
            ) : gate.kind === "signIn" ? (
              <Button component={Link} href="/auth/login?callbackUrl=%2Finit">
                {t("init.studio.claim.signIn")}
              </Button>
            ) : gate.kind === "expired" && props.claimTransport === "source-http" ? (
              <Button onClick={() => setAttempt((value) => value + 1)}>{t("common.action.tryAgain")}</Button>
            ) : (
              <Button component={Link} href="/init" variant="default">
                {t("common.action.tryAgain")}
              </Button>
            )}
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (step.state.kind === "loading" || step.state.kind === "disabled") {
    return (
      <Center mih="100dvh" p="md">
        <Stack maw="36rem" w="100%" aria-busy="true">
          <Text component="output">{t("init.studio.claim.checking")}</Text>
          <Skeleton height={48} />
          <Skeleton height={120} />
        </Stack>
      </Center>
    );
  }
  if (step.state.kind === "error") {
    return (
      <Center mih="100dvh" p="md">
        <Stack maw="36rem">
          <Alert color="red" role="alert">
            {onboardingError(step.state.error, t)}
          </Alert>
          <Button onClick={step.retry}>{t("common.action.tryAgain")}</Button>
        </Stack>
      </Center>
    );
  }
  if (step.state.data.current !== currentStep) {
    return (
      <Center mih="100dvh" p="md">
        <Stack maw="36rem">
          <Alert color="yellow" role="alert">
            {source.holds.changed}
          </Alert>
          <Button component={Link} href="/init">
            {t("common.action.tryAgain")}
          </Button>
        </Stack>
      </Center>
    );
  }

  if (currentStep === "setup")
    return <SetupStudio {...props} environment={environment} onAuthorityFailure={onAuthorityFailure} />;
  if (currentStep === "user" || currentStep === "group")
    return (
      <AccountSetup {...props} environment={environment} claimTarget={gate} onAuthorityFailure={onAuthorityFailure} />
    );
  if (currentStep === "start") {
    const Welcome = source.presentation.Welcome;
    return (
      <Welcome
        t={t}
        wordmark={<Wordmark large />}
        backdrop={<Backdrop />}
        version={environment.version}
        databaseDriver={environment.databaseDriver}
        startHold={source.holds.transition}
        restoreHold={source.holds.restore}
        showRestore={Boolean(props.sqliteRestore)}
        sqliteRestore={props.sqliteRestore}
      />
    );
  }
  return <Finish {...props} environment={environment} />;
}

function Finish<Kind extends string, Secret extends string, Locale extends string>({
  environment,
  source,
}: OnboardingProps<Kind, Secret, Locale>) {
  const t = source.t;
  const View = source.presentation.Finish;
  const Wordmark = source.OnboardingWordmark;
  const Backdrop = source.presentation.Backdrop;
  const board = environment.initialBoard ?? environment.availableBoards[0];
  const boardHref = board ? `/boards/${encodeURIComponent(board.name)}` : "/manage/boards";
  const destination = environment.canConfigurePrivileged
    ? boardHref
    : `/auth/login?callbackUrl=${encodeURIComponent(boardHref)}`;
  const primaryColor = environment.initialBoard?.primaryColor ?? "#fa5252";
  const secondaryColor = environment.initialBoard?.secondaryColor ?? "#fd7e14";
  return (
    <View
      t={t}
      wordmark={<Wordmark primaryColor={primaryColor} secondaryColor={secondaryColor} />}
      backdrop={<Backdrop />}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      destination={destination}
      documentationUrl={source.createDocumentationLink("/docs/getting-started/after-the-installation")}
      Link={source.presentation.Link}
    />
  );
}

function formatExpiry(expiresAt: number): string {
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? String(expiresAt) : date.toLocaleString();
}
