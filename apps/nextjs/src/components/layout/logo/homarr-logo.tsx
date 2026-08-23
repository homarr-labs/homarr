"use client";

import { useSettings } from "@homarr/settings";

import type { LogoWithTitleProps } from "./logo";
import { Logo, LogoWithTitle } from "./logo";
import { homarrLogoPath } from "./constants";

interface LogoProps {
  size: number;
}

const useBrandLogo = () => {
  const { branding } = useSettings();
  return {
    title: branding.appName,
    image: {
      src: branding.logoImageUrl ?? homarrLogoPath,
      alt: `${branding.appName} logo`,
      shouldUseNextImage: branding.logoImageUrl === null,
    },
  };
};

export const HomarrLogo = ({ size }: LogoProps) => {
  const brand = useBrandLogo();
  return <Logo size={size} {...brand.image} />;
};

interface CommonLogoWithTitleProps {
  size: LogoWithTitleProps["size"];
  hideTitleOnMobile?: boolean;
}

export const HomarrLogoWithTitle = ({ size, hideTitleOnMobile }: CommonLogoWithTitleProps) => {
  const brand = useBrandLogo();
  return <LogoWithTitle size={size} title={brand.title} image={brand.image} hideTitleOnMobile={hideTitleOnMobile} />;
};
