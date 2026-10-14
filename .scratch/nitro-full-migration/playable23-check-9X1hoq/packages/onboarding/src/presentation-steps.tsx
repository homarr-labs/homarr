import type { ComponentPropsWithRef, CSSProperties, FunctionComponent, MouseEvent, ReactNode } from "react";
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconDatabaseImport, IconSparkles, IconTool } from "@tabler/icons-react";
import confetti from "canvas-confetti";

import classes from "./onboarding-studio.module.css";

type Translate = (key: string, values?: Record<string, string | number>) => string;

interface StepViewProps {
  t: Translate;
  wordmark: ReactNode;
  backdrop: ReactNode;
}

export interface OnboardingWelcomeViewProps extends StepViewProps {
  version: string;
  databaseDriver: "sqlite" | "postgresql";
  startHold: string;
  restoreHold: string;
  showRestore: boolean;
}

export function OnboardingWelcomeView(props: OnboardingWelcomeViewProps) {
  const t = (key: string, values?: Record<string, string | number>) => props.t(`init.studio.welcome.${key}`, values);
  return (
    <main className={classes.page}>
      {props.backdrop}
      <div className={classes.shell}>
        <section className={classes.hero} aria-labelledby="onboarding-welcome-title">
          <Stack gap="xl" align="center">
            {props.wordmark}
            <Stack gap="sm" align="center">
              <Title id="onboarding-welcome-title" className={classes.heroTitle} ta="center">
                {t("title")}
              </Title>
              <Text size="lg" c="dimmed" maw="38rem" ta="center">
                {t("description", { version: props.version })}
              </Text>
            </Stack>
            <Group className={classes.primaryActions} gap="sm">
              <Button
                size="lg"
                rightSection={<IconArrowRight size={18} />}
                disabled
                aria-describedby="onboarding-start-hold"
              >
                {t("start")}
              </Button>
              {props.databaseDriver === "sqlite" && props.showRestore ? (
                <Button
                  size="lg"
                  variant="default"
                  leftSection={<IconDatabaseImport size={18} />}
                  disabled
                  aria-describedby="onboarding-restore-hold"
                >
                  {t("restore")}
                </Button>
              ) : null}
            </Group>
            <Alert color="yellow" role="alert" id="onboarding-start-hold" maw="38rem">
              {props.startHold}
            </Alert>
            {props.databaseDriver === "sqlite" && props.showRestore ? (
              <Paper withBorder p="lg" radius="lg" w="100%" maw="56rem">
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
                  <Alert id="onboarding-restore-hold" color="yellow">
                    {props.restoreHold}
                  </Alert>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </section>
      </div>
    </main>
  );
}

export interface OnboardingFinishViewProps extends StepViewProps {
  destination: string;
  documentationUrl: string;
  primaryColor: string;
  secondaryColor: string;
  Link: FunctionComponent<ComponentPropsWithRef<"a"> & { href: string }>;
}

export function OnboardingFinishView(props: OnboardingFinishViewProps) {
  const t = (key: string) => props.t(`init.studio.finish.${key}`);
  const style: CSSProperties & Record<"--studio-glow-color" | "--studio-secondary-glow-color", string> = {
    "--studio-glow-color": props.primaryColor,
    "--studio-secondary-glow-color": props.secondaryColor,
  };
  const openBoard = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const button = event.currentTarget.getBoundingClientRect();
    void confetti({
      particleCount: 120,
      spread: 75,
      startVelocity: 45,
      origin: {
        x: (button.left + button.width / 2) / window.innerWidth,
        y: (button.top + button.height / 2) / window.innerHeight,
      },
      disableForReducedMotion: true,
    });
  };
  return (
    <main className={classes.page} style={style}>
      {props.backdrop}
      <div className={classes.shell}>
        <Stack mih="calc(100dvh - 6rem)" justify="center" align="center">
          <div style={{ width: "100%", maxWidth: "52rem" }}>
            <Paper className={classes.studio} radius="lg" p={{ base: "lg", sm: "xl" }}>
              <Stack gap="xl" align="center">
                {props.wordmark}
                <Stack gap="xs" align="center">
                  <Title ta="center">{t("title")}</Title>
                  <Text c="dimmed" ta="center" maw="42rem">
                    {t("description")}
                  </Text>
                </Stack>
                <Button
                  component={props.Link}
                  href={props.destination}
                  size="lg"
                  className={classes.finishPrimaryAction}
                  rightSection={<IconArrowRight size={18} />}
                  onClick={openBoard}
                >
                  {t("openBoard")}
                </Button>
                <SimpleGrid cols={{ base: 1, sm: 3 }} w="100%">
                  <NextCard
                    Link={props.Link}
                    icon={IconTool}
                    title={t("manageTitle")}
                    description={t("manageDescription")}
                    href="/manage"
                  />
                  <NextCard
                    Link={props.Link}
                    icon={IconSparkles}
                    title={t("workshopTitle")}
                    description={t("workshopDescription")}
                    href="/manage/workshop"
                  />
                  <NextCard
                    Link={props.Link}
                    icon={IconBook2}
                    title={t("docsTitle")}
                    description={t("docsDescription")}
                    href={props.documentationUrl}
                    external
                  />
                </SimpleGrid>
              </Stack>
            </Paper>
          </div>
        </Stack>
      </div>
    </main>
  );
}

function NextCard({
  icon: Icon,
  Link,
  title,
  description,
  href,
  external,
}: {
  icon: typeof IconTool;
  Link: OnboardingFinishViewProps["Link"];
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <Stack gap="sm">
      <Group gap="xs">
        <ThemeIcon variant="light" size="md">
          <Icon size={17} />
        </ThemeIcon>
        <Text fw={650}>{title}</Text>
      </Group>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Stack>
  );
  if (external)
    return (
      <Paper
        className={classes.nextCard}
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        withBorder
        radius="md"
        p="md"
      >
        {content}
      </Paper>
    );
  return (
    <Paper className={classes.nextCard} component={Link} href={href} withBorder radius="md" p="md">
      {content}
    </Paper>
  );
}
