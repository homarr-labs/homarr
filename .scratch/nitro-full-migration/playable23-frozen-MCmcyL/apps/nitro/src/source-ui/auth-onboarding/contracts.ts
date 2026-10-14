import type { ComponentType, ReactNode } from "react";
import type { PasswordInputProps } from "@mantine/core";
import type { z } from "zod/v4";

export type AuthTranslate = (key: string, values?: Record<string, string | number>) => string;

export interface AuthShellProps {
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

export interface AuthBranding {
  appName: string;
  isCustomAppName: boolean;
  greeting: string;
  authBranding: { showGreeting: boolean; showAppName: boolean; showLogo: boolean };
  primaryColor: string;
  secondaryColor: string;
  wordmarkPrimaryColor?: string;
  wordmarkSecondaryColor?: string;
  logoImageUrl: string | null;
  signInBackgroundImageUrl: string | null;
  signInBackgroundOverlay: number;
  defaultRadius: AuthShellProps["radius"];
}

export interface AuthPresentation {
  Shell: ComponentType<AuthShellProps>;
  t: AuthTranslate;
  branding: AuthBranding;
}

export interface RegistrationPresentation {
  PasswordInput: ComponentType<PasswordInputProps & { withPasswordRequirements?: boolean }>;
  t: AuthTranslate;
  validationErrorMap: z.core.$ZodErrorMap<z.core.$ZodIssue>;
  hold: string;
}

export function authShellBranding(
  branding: AuthBranding,
): Omit<AuthShellProps, "children" | "title" | "description" | "icon"> {
  return {
    appName: branding.appName,
    showAppName: branding.authBranding.showAppName,
    showAppLogo: branding.authBranding.showLogo,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    wordmarkPrimaryColor: branding.wordmarkPrimaryColor,
    wordmarkSecondaryColor: branding.wordmarkSecondaryColor,
    logoImageUrl: branding.logoImageUrl ?? undefined,
    backgroundImageUrl: branding.signInBackgroundImageUrl ?? undefined,
    backgroundOverlay: branding.signInBackgroundOverlay,
    radius: branding.defaultRadius,
  };
}
