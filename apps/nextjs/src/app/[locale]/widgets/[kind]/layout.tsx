import type { PropsWithChildren } from "react";

import { loadAllWidgetDefinitions } from "@homarr/widgets/manifest";

import { MainNavigation } from "~/components/layout/navigation";
import { ClientShell } from "~/components/layout/shell";

const getLinks = async () => {
  const definitions = await loadAllWidgetDefinitions();
  return [...definitions].map(([key, definition]) => {
    return {
      href: `/widgets/${key}`,
      icon: definition.icon,
      label: key,
    };
  });
};

export default async function WidgetPreviewLayout({ children }: PropsWithChildren) {
  const links = await getLinks();

  return (
    <ClientShell hasHeader={false}>
      <MainNavigation links={links} />
      {children}
    </ClientShell>
  );
}
