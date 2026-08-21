"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconSparkles, IconTool } from "@tabler/icons-react";
import confetti from "canvas-confetti";

import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import type { OnboardingStudioProps } from "./types";
import { useOnboardingSounds } from "./use-onboarding-sounds";
import classes from "./onboarding-studio.module.css";

export const Finish = ({ environment }: OnboardingStudioProps) => {
  const t = useI18n("init.studio.finish");
  const sounds = useOnboardingSounds();
  const primaryColor = environment.initialBoard?.primaryColor ?? "#fa5252";
  const secondaryColor = environment.initialBoard?.secondaryColor ?? "#fd7e14";
  const boardHref = `/boards/${encodeURIComponent(environment.initialBoard?.name ?? "dashboard")}`;
  const destination = environment.canConfigurePrivileged
    ? boardHref
    : `/auth/login?callbackUrl=${encodeURIComponent(boardHref)}`;
  const openBoard = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    sounds.success();
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    event.preventDefault();
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
    window.setTimeout(() => window.location.assign(destination), 450);
  };

  return (
    <main
      className={classes.page}
      style={
        {
          "--studio-glow-color": primaryColor,
          "--studio-secondary-glow-color": secondaryColor,
        } as CSSProperties
      }
    >
      <OnboardingBackdrop />
      <div className={classes.shell}>
        <Stack mih="calc(100dvh - 6rem)" justify="center" align="center">
          <div style={{ width: "100%", maxWidth: "52rem" }}>
            <Paper className={classes.studio} radius="lg" p={{ base: "lg", sm: "xl" }}>
              <Stack gap="xl" align="center">
                <OnboardingWordmark primaryColor={primaryColor} secondaryColor={secondaryColor} />
                <Stack gap="xs" align="center">
                  <Title ta="center">{t("title")}</Title>
                  <Text c="dimmed" ta="center" maw="42rem">
                    {t("description")}
                  </Text>
                </Stack>
                <Button
                  component={Link}
                  href={destination}
                  size="lg"
                  className={classes.finishPrimaryAction}
                  rightSection={<IconArrowRight size={18} />}
                  onClick={openBoard}
                >
                  {t("openBoard")}
                </Button>
                <SimpleGrid cols={{ base: 1, sm: 3 }} w="100%">
                  <NextCard
                    icon={IconTool}
                    title={t("manageTitle")}
                    description={t("manageDescription")}
                    href="/manage"
                  />
                  <NextCard
                    icon={IconSparkles}
                    title={t("workshopTitle")}
                    description={t("workshopDescription")}
                    href="/manage/workshop"
                  />
                  <NextCard
                    icon={IconBook2}
                    title={t("docsTitle")}
                    description={t("docsDescription")}
                    href={createDocumentationLink("/docs/getting-started/after-the-installation")}
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
};

const NextCard = (props: {
  icon: typeof IconTool;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) => (props.external ? <ExternalNextCard {...props} /> : <InternalNextCard {...props} />);

const InternalNextCard = ({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof IconTool;
  title: string;
  description: string;
  href: string;
}) => (
  <Paper className={classes.nextCard} component={Link} href={href} withBorder radius="md" p="md">
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
  </Paper>
);

const ExternalNextCard = ({ icon: Icon, title, description, href }: Parameters<typeof NextCard>[0]) => (
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
  </Paper>
);
