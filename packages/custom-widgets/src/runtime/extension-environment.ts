"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useComputedColorScheme, useMantineTheme } from "@mantine/core";

export function useCustomWidgetEnvironment() {
  const ref = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState({ width: 0, height: 0 });
  const colorScheme = useComputedColorScheme("light");
  const mantine = useMantineTheme();
  const theme = useMemo(
    () => ({
      colorScheme,
      primaryColor: mantine.primaryColor,
      colors: mantine.colors,
      spacing: mantine.spacing,
      radius: mantine.radius,
      fontFamily: mantine.fontFamily,
    }),
    [colorScheme, mantine],
  );
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setContainer((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, container, theme };
}
