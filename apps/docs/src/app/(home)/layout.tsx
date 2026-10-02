import { Carbon } from "@/components/carbon";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";

import { baseOptions } from "@/lib/layout.shared";
import { SiteFooter } from "@/components/site-footer";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex min-h-[calc(100dvh-var(--fd-nav-height))] flex-col">
        <div className="flex-1">{children}</div>
        <Carbon placement="site-footer" />
        <SiteFooter />
      </div>
    </HomeLayout>
  );
}
