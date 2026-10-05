"use client";

import { useColorMode } from "@/hooks/use-color-mode";
import { CommonWidgetProps, WidgetCard } from "./card";
import clsx from "clsx";

export const EntityStateWidget = ({ className }: CommonWidgetProps) => {
  const colorMode = useColorMode();

  return (
    <WidgetCard
      width={1}
      className={clsx("text-center", className)}
      onClick={() => colorMode.setColorMode(colorMode.isDarkTheme ? "light" : "dark")}
    >
      <span className="text-sm font-bold">Lights</span>
      <span className="text-sm dark:hidden">ON</span>
      <span className="hidden text-sm dark:inline">OFF</span>
    </WidgetCard>
  );
};
