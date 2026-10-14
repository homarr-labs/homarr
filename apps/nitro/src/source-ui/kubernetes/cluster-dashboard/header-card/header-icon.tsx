import { IconBrandGit, IconCloudShare, IconGeometry } from "@tabler/icons-react";

import type { HeaderTypes } from "./header-card";

export function HeaderIcon({ type }: { type: HeaderTypes }) {
  switch (type) {
    case "providers":
      return <IconCloudShare size={28} stroke={1.5} />;
    case "version":
      return <IconBrandGit size={28} stroke={1.5} />;
    default:
      return <IconGeometry size={28} stroke={1.5} />;
  }
}
