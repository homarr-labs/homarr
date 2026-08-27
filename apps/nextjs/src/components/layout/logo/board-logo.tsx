"use client";

import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";

import { homarrLogoPath } from "./constants";
import type { LogoWithTitleProps } from "./logo";
import { Logo, LogoWithTitle } from "./logo";

interface LogoProps {
  size: number;
}

const useImageOptions = () => {
  const board = useRequiredBoard();
  const { branding } = useSettings();
  return {
    src: board.logoImageUrl?.trim() || branding.logoImageUrl?.trim() || homarrLogoPath,
    alt: "Board logo",
    shouldUseNextImage: false,
  };
};

export const BoardLogo = ({ size }: LogoProps) => {
  const imageOptions = useImageOptions();
  return <Logo size={size} {...imageOptions} />;
};

interface CommonLogoWithTitleProps {
  size: LogoWithTitleProps["size"];
  hideTitleOnMobile?: boolean;
}

export const BoardLogoWithTitle = ({ size, hideTitleOnMobile }: CommonLogoWithTitleProps) => {
  const board = useRequiredBoard();
  const { branding } = useSettings();
  const imageOptions = useImageOptions();
  return (
    <LogoWithTitle
      size={size}
      hideTitleOnMobile={hideTitleOnMobile}
      title={board.pageTitle ?? branding.appName}
      image={imageOptions}
    />
  );
};

export const BoardLogoWithName = ({ size }: Pick<CommonLogoWithTitleProps, "size">) => {
  const board = useRequiredBoard();
  const imageOptions = useImageOptions();
  return <LogoWithTitle size={size} title={board.name} image={imageOptions} />;
};
