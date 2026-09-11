"use client";

import { useEffect } from "react";

export function LegacyCategoryRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(`${href}${window.location.search}${window.location.hash}`);
  }, [href]);

  return <a href={href}>Continue to the documentation</a>;
}
