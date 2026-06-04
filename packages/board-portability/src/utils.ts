import superjson from "superjson";

import { emptySuperJSON } from "@homarr/definitions";

export const parseStoredValue = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value || value === emptySuperJSON) {
    return fallback;
  }
  return superjson.parse(value) as T;
};

export const stringifyForDb = (value: unknown): string => {
  return superjson.stringify(value);
};

export const replaceAppIdsInValue = (value: unknown, appIdToRef: Map<string, string>): unknown => {
  if (typeof value === "string") {
    const ref = appIdToRef.get(value);
    return ref ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceAppIdsInValue(entry, appIdToRef));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceAppIdsInValue(entry, appIdToRef)]),
    );
  }

  return value;
};

export const replaceAppRefsInValue = (value: unknown, refToAppId: Map<string, string>): unknown => {
  if (typeof value === "string") {
    const appId = refToAppId.get(value);
    return appId ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceAppRefsInValue(entry, refToAppId));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceAppRefsInValue(entry, refToAppId)]),
    );
  }

  return value;
};
