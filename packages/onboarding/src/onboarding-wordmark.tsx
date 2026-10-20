"use client";

import { lazy, Suspense } from "react";

import classes from "./onboarding-studio.module.css";

const InteractiveWordmark = lazy(() =>
  import("./interactive-wordmark").then((module) => ({ default: module.InteractiveWordmark })),
);

interface OnboardingWordmarkProps {
  appName?: string;
  logoImageUrl?: string;
  showAppName?: boolean;
  showAppLogo?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  large?: boolean;
}

const defaultWordmarkUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg";

export const OnboardingWordmark = ({
  appName,
  logoImageUrl,
  showAppName,
  showAppLogo,
  primaryColor,
  secondaryColor,
  large = false,
}: OnboardingWordmarkProps) => {
  const className = `${classes.wordmark} ${classes.onboardingWordmark} ${large ? classes.welcomeWordmark : ""}`;

  const hasVisibilityControls = showAppName !== undefined || showAppLogo !== undefined;
  const resolvedAppName = appName?.trim() || "Homarr";
  const shouldRenderDefaultWordmark = showAppLogo && showAppName && !logoImageUrl && resolvedAppName === "Homarr";

  if (hasVisibilityControls && !shouldRenderDefaultWordmark) {
    const visibleLogoImageUrl = showAppLogo ? (logoImageUrl ?? "/logo/logo.png") : undefined;
    if (!visibleLogoImageUrl && !showAppName) return null;

    return (
      <div className={classes.customBrand} data-large={large || undefined} aria-label={resolvedAppName}>
        {visibleLogoImageUrl ? (
          <img
            className={classes.customBrandImage}
            src={visibleLogoImageUrl}
            alt={showAppName ? "" : resolvedAppName}
          />
        ) : null}
        {showAppName ? <span>{resolvedAppName}</span> : null}
      </div>
    );
  }

  if (primaryColor === undefined && secondaryColor === undefined) {
    return <img src={defaultWordmarkUrl} alt={resolvedAppName} width={1477} height={1054} className={className} />;
  }

  return (
    <Suspense
      fallback={
        <span aria-hidden className={className} style={{ display: "inline-block", aspectRatio: "1477 / 1054" }} />
      }
    >
      <InteractiveWordmark
        label={resolvedAppName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        className={className}
      />
    </Suspense>
  );
};
