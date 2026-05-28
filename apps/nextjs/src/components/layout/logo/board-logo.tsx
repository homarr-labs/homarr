"use client";

import { Group } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";

import { QueryRefreshIndicator } from "../header/query-refresh-indicator";
import { homarrLogoPath, homarrPageTitle } from "./homarr-logo";
import type { LogoWithTitleProps } from "./logo";
import { Logo, LogoWithTitle } from "./logo";

interface LogoProps {
  size: number;
}

const useImageOptions = () => {
  const board = useRequiredBoard();
  return {
    src: board.logoImageUrl ?? homarrLogoPath,
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
  const imageOptions = useImageOptions();
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <LogoWithTitle
        size={size}
        hideTitleOnMobile={hideTitleOnMobile}
        title={board.pageTitle ?? homarrPageTitle}
        image={imageOptions}
      />
      <QueryRefreshIndicator />
    </Group>
  );
};
