import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import { OnboardingAuthShellView } from "./presentation-auth-shell";
import type { OnboardingAuthShellProps } from "./presentation-auth-shell";
export type { OnboardingAuthShellProps } from "./presentation-auth-shell";

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
  <OnboardingAuthShellView
    title={title}
    description={description}
    icon={icon}
    footer={footer}
    primaryColor={primaryColor}
    secondaryColor={secondaryColor}
    backgroundImageUrl={backgroundImageUrl}
    backgroundOverlay={backgroundOverlay}
    radius={radius}
    backdrop={<OnboardingBackdrop />}
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
  >
    {children}
  </OnboardingAuthShellView>
);
