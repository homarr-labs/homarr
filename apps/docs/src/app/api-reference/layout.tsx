import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { apiSource } from "@/lib/openapi";
import { baseOptions } from "@/lib/layout.shared";

export default function ApiReferenceLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={apiSource.pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
