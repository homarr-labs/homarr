import type { ReactNode } from "react";
import { Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";

import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import classes from "./onboarding-studio.module.css";

interface OnboardingAuthShellProps {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export const OnboardingAuthShell = ({ title, description, icon, children, footer }: OnboardingAuthShellProps) => (
  <main className={classes.page}>
    <OnboardingBackdrop />
    <div className={`${classes.shell} ${classes.authShell}`}>
      <Stack className={classes.authLayout} gap="xl" align="center" justify="center">
        <div className={classes.authBrand}>
          <OnboardingWordmark large />
        </div>
        <Paper className={`${classes.studio} ${classes.authCard}`} radius="lg" p={{ base: "lg", sm: "xl" }}>
          <Stack gap="xl">
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon size="xl" radius="lg" variant="light">
                {icon}
              </ThemeIcon>
              <Stack gap={4}>
                <Title order={1} size="h2">
                  {title}
                </Title>
                <Text c="dimmed">{description}</Text>
              </Stack>
            </Group>
            {children}
          </Stack>
        </Paper>
        {footer ? (
          <Text className={classes.authFooter} size="sm" c="dimmed" ta="center">
            {footer}
          </Text>
        ) : null}
      </Stack>
    </div>
  </main>
);
