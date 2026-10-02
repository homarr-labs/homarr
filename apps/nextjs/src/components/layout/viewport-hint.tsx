"use client";

import { useEffect } from "react";

import { boardViewportWidthCookieName } from "@homarr/boards/layout-selection";

export const ViewportHint = () => {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      document.cookie = `${boardViewportWidthCookieName}=${Math.round(viewportWidth)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    };
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(persist, 150);
    };

    persist();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
};
