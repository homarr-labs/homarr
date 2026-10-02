"use client";

import { useTheme } from "next-themes";

export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";

  return {
    colorMode,
    isDarkTheme: colorMode === "dark",
    setColorMode: setTheme,
  } as const;
}
