import { getIntegrationName } from "@homarr/definitions";
import type { HttpIntegrationKind } from "@homarr/definitions";

import { Badge } from "@/components/ui/badge";

export function WorkshopIntegrationBadges({ kinds }: { kinds: readonly HttpIntegrationKind[] }) {
  if (kinds.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Integrations">
      {kinds.map((kind) => (
        <li key={kind}>
          <Badge variant="secondary">{getIntegrationName(kind)}</Badge>
        </li>
      ))}
    </ul>
  );
}
