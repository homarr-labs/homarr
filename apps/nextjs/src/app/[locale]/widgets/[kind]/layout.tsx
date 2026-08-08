import type { PropsWithChildren } from "react";

import { widgetKinds } from "@homarr/definitions";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";

import { MainNavigation } from "~/components/layout/navigation";
import { ClientShell } from "~/components/layout/shell";

const links = widgetKinds.map((kind) => ({
  href: `/widgets/${kind}`,
  icon: widgetCatalogIcons[kind],
  label: kind,
}));

export default function WidgetPreviewLayout({ children }: PropsWithChildren) {
  return (
    <ClientShell hasHeader={false}>
      <MainNavigation links={links} />
      {children}
    </ClientShell>
  );
}
