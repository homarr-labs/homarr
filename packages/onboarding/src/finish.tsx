"use client";

import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconLayoutDashboard, IconSparkles, IconTool } from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";

import { createDocumentationLink } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { OnboardingStudioProps } from "./types";
import classes from "./onboarding-studio.module.css";

export const Finish = ({ environment }: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio.finish");
  const reduceMotion = useReducedMotion();
  const boardHref = `/boards/${encodeURIComponent(environment.initialBoard?.name ?? "dashboard")}`;
  const destination = environment.canConfigurePrivileged
    ? boardHref
    : `/auth/login?callbackUrl=${encodeURIComponent(boardHref)}`;

  return (
    <main className={classes.page}>
      <div className={classes.shell}>
        <Stack mih="calc(100dvh - 6rem)" justify="center" align="center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ width: "100%", maxWidth: "52rem" }}
          >
            <Paper className={classes.studio} radius="lg" p={{ base: "lg", sm: "xl" }}>
              <Stack gap="xl" align="center">
                <motion.div
                  animate={reduceMotion ? undefined : { rotate: [0, 7, -7, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.4 }}
                >
                  <ThemeIcon size={78} radius="xl" variant="light" color="green">
                    <IconSparkles size={36} />
                  </ThemeIcon>
                </motion.div>
                <Stack gap="xs" align="center">
                  <Title ta="center">{t("title")}</Title>
                  <Text c="dimmed" ta="center" maw="42rem">
                    {t("description")}
                  </Text>
                </Stack>
                <Button component={Link} href={destination} size="lg" rightSection={<IconArrowRight size={18} />}>
                  {t("openBoard")}
                </Button>
                <Alert variant="light" w="100%" icon={<IconLayoutDashboard size={18} />}>
                  {t("tutorial")}
                </Alert>
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
          </motion.div>
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
