import type { CSSProperties, ReactNode } from "react";
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
  appName?: string;
  showAppName?: boolean;
  showAppLogo?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  wordmarkPrimaryColor?: string;
  wordmarkSecondaryColor?: string;
  logoImageUrl?: string;
  backgroundImageUrl?: string;
  backgroundOverlay?: number;
  radius?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const OnboardingAuthShell = ({
  title,
  description,
  icon,
  children,
  footer,
  appName,
  showAppName = false,
  showAppLogo = false,
  primaryColor,
  secondaryColor,
  wordmarkPrimaryColor,
  wordmarkSecondaryColor,
  logoImageUrl,
  backgroundImageUrl,
  backgroundOverlay = 0.55,
  radius = "lg",
}: OnboardingAuthShellProps) => (
  <main
    className={classes.page}
    data-background-image={backgroundImageUrl ? true : undefined}
    style={
      {
        "--studio-glow-color": primaryColor,
        "--studio-secondary-glow-color": secondaryColor,
        "--auth-background-overlay": backgroundOverlay,
      } as CSSProperties
    }
  >
    {backgroundImageUrl ? (
      <div
        aria-hidden
        className={classes.authBackground}
        style={{ backgroundImage: `url(${JSON.stringify(backgroundImageUrl)})` }}
      />
    ) : null}
    <OnboardingBackdrop />
    <div className={`${classes.shell} ${classes.authShell}`}>
      <Stack className={classes.authLayout} gap="xl" align="center" justify="center">
        {showAppName || showAppLogo ? (
          <div className={classes.authBrand}>
            <OnboardingWordmark
              large
              appName={appName}
              showAppName={showAppName}
              showAppLogo={showAppLogo}
              primaryColor={wordmarkPrimaryColor}
              secondaryColor={wordmarkSecondaryColor}
              logoImageUrl={logoImageUrl}
            />
          </div>
        ) : null}
        <Paper className={`${classes.studio} ${classes.authCard}`} radius={radius} p={{ base: "lg", sm: "xl" }}>
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
