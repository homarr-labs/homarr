"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBook, IconPackage } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import MarketplaceDetailPage from "./DetailPage";

export function WorkshopNotFoundRouter({ configuredWorkshopUrl }: { configuredWorkshopUrl: string }) {
  const routerPathname = usePathname();
  const [pathname, setPathname] = useState("");
  useEffect(() => {
    // The static 404 shell carries its build-time route, not the requested Workshop URL.
    setPathname(window.location.pathname);
  }, [routerPathname]);
  const submissionId = /^\/workshop\/([^/]+)\/?$/.exec(pathname)?.[1];

  if (submissionId && submissionId !== "admin") {
    return <MarketplaceDetailPage configuredWorkshopUrl={configuredWorkshopUrl} submissionId={submissionId} />;
  }

  return (
    <main>
      <Empty className="mx-auto min-h-[60vh] max-w-xl px-5 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPackage />
          </EmptyMedia>
          <EmptyTitle className="text-xl">Page not found</EmptyTitle>
          <EmptyDescription>The page may have moved, or the address may be incomplete.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button nativeButton={false} render={<a href="/docs" aria-label="Browse documentation" />}>
            <IconBook /> Browse documentation
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="/workshop" aria-label="Open Workshop" />}>
            <IconPackage /> Open Workshop
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
