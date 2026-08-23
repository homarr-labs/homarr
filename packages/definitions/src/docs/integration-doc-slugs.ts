import { objectEntries } from "@homarr/common";

import type { IntegrationKind } from "../integration";
import { integrationDefs } from "../integration";

export const integrationDocSlugs = Object.fromEntries(
  objectEntries(integrationDefs).map(([kind, definition]) => [kind, definition.documentationSlug]),
) as Record<IntegrationKind, string | null>;
