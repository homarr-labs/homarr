"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function StaticRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${href}${window.location.search}${window.location.hash}`);
  }, [href, router]);

  return <a href={href}>{label}</a>;
}
