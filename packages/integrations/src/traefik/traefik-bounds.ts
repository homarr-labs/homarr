import type { Response } from "undici";

import { readBoundedJsonResponseAsync as readBoundedJsonResponse } from "@homarr/common/server";

export const MAX_TRAEFIK_RESPONSE_BYTES = 2 * 1024 * 1024;

export async function readBoundedTraefikJsonAsync(
  response: Response,
  maxBytes = MAX_TRAEFIK_RESPONSE_BYTES,
): Promise<unknown> {
  return await readBoundedJsonResponse(response, maxBytes, "Traefik response");
}
