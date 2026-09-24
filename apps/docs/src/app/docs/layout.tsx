import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { DocsSidebarFolder } from "@/components/docs/docs-sidebar-folder";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions()}
      tree={source.getPageTree()}
      sidebar={{ defaultOpenLevel: 1, components: { Folder: DocsSidebarFolder } }}
    >
      {children}
    </DocsLayout>
  );
}
