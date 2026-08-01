import type { Response } from "undici";

import { readBoundedJsonResponseAsync as readBoundedJsonResponse } from "@homarr/common/server";

export const DEFAULT_TIMETABLE_BASE_URL = "https://search.ch";
export const MAX_TIMETABLE_RESPONSE_BYTES = 512 * 1024;

export const normalizeTimetableBaseUrl = (baseUrl: string) => {
  if (baseUrl.length > 2_048) throw new Error("Timetable base URL is too long");

  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Timetable base URL must use HTTP or HTTPS");
  }
  if (url.username || url.password) throw new Error("Timetable base URL must not contain credentials");
  if (url.search || url.hash) throw new Error("Timetable base URL must not contain a query or fragment");

  return url.toString().replace(/\/$/, "");
};

export async function readBoundedTimetableJsonAsync(
  response: Response,
  maxBytes = MAX_TIMETABLE_RESPONSE_BYTES,
): Promise<unknown> {
  return await readBoundedJsonResponse(response, maxBytes, "Timetable response");
}
