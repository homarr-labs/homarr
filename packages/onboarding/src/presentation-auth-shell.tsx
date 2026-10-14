import type { ComponentType, CSSProperties, ReactNode } from "react";
import { createElement } from "react";
import { Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";

import { OnboardingWordmark } from "./onboarding-wordmark";
import { OnboardingBackdropView } from "./presentation-backdrop";
import classes from "./onboarding-studio.module.css";

export interface OnboardingAuthShellProps {
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

export type OnboardingAuthShellViewProps = Pick<
  OnboardingAuthShellProps,
  | "title"
  | "description"
  | "icon"
  | "children"
  | "footer"
  | "primaryColor"
  | "secondaryColor"
  | "backgroundImageUrl"
  | "backgroundOverlay"
  | "radius"
> & { wordmark: ReactNode; backdrop: ReactNode };

export function OnboardingAuthShellView({
  title,
  description,
  icon,
  children,
  footer,
  primaryColor,
  secondaryColor,
  backgroundImageUrl,
  backgroundOverlay = 0.55,
  radius = "lg",
  wordmark,
  backdrop,
}: OnboardingAuthShellViewProps) {
  const style: CSSProperties & {
    "--studio-glow-color": string | undefined;
    "--studio-secondary-glow-color": string | undefined;
    "--auth-background-overlay": number;
  } = {
    "--studio-glow-color": primaryColor,
    "--studio-secondary-glow-color": secondaryColor,
    "--auth-background-overlay": backgroundOverlay,
  };
  return (
    <main className={classes.page} data-background-image={backgroundImageUrl ? true : undefined} style={style}>
      {backgroundImageUrl ? (
        <div
          aria-hidden
          className={classes.authBackground}
          style={{ backgroundImage: `url(${JSON.stringify(backgroundImageUrl)})` }}
        />
      ) : null}
      {backdrop}
      <div className={`${classes.shell} ${classes.authShell}`}>
        <Stack className={classes.authLayout} gap="xl" align="center" justify="center">
          {wordmark ? <div className={classes.authBrand}>{wordmark}</div> : null}
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
}

export function createOnboardingPresentation(Marquee: ComponentType<{ className?: string }>) {
  function Backdrop() {
    return createElement(OnboardingBackdropView, { marquee: createElement(Marquee) });
  }
  function AuthShell(props: OnboardingAuthShellProps) {
    const {
      appName,
      showAppName = false,
      showAppLogo = false,
      wordmarkPrimaryColor,
      wordmarkSecondaryColor,
      logoImageUrl,
      ...shell
    } = props;
    return (
      <OnboardingAuthShellView
        {...shell}
        backdrop={createElement(Backdrop)}
        wordmark={
          showAppName || showAppLogo ? (
            <OnboardingWordmark
              large
              appName={appName}
              showAppName={showAppName}
              showAppLogo={showAppLogo}
              primaryColor={wordmarkPrimaryColor}
              secondaryColor={wordmarkSecondaryColor}
              logoImageUrl={logoImageUrl}
            />
          ) : null
        }
      />
    );
  }
  return { AuthShell, Backdrop };
}
