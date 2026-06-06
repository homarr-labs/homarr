import SuperJSON from "superjson";

import type { InferInsertModel } from "@homarr/db";
import type { boards } from "@homarr/db/schema";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes, emptySuperJSON } from "@homarr/definitions";

import type { HomarrBundleBoard } from "./schema";

export const parseStoredValue = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value || value === emptySuperJSON) {
    return fallback;
  }
  return SuperJSON.parse(value) as T;
};

export const stringifyForDb = (value: unknown): string => {
  return SuperJSON.stringify(value);
};

export const mustGet = <T>(map: Map<string, T>, key: string): T => {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Missing map entry for key "${key}"`);
  }
  return value;
};

const replaceMapValues = (value: unknown, map: Map<string, string>): unknown => {
  if (typeof value === "string") {
    return map.get(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceMapValues(entry, map));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceMapValues(entry, map)]),
    );
  }

  return value;
};

export const replaceAppIdsInValue = replaceMapValues;
export const replaceAppRefsInValue = replaceMapValues;

export const buildBoardInsertRow = (
  boardId: string,
  name: string,
  creatorId: string | null,
  settings: HomarrBundleBoard["settings"],
): InferInsertModel<typeof boards> => ({
  id: boardId,
  name,
  creatorId,
  isPublic: settings.isPublic ?? false,
  pageTitle: settings.pageTitle ?? null,
  metaTitle: settings.metaTitle ?? null,
  logoImageUrl: settings.logoImageUrl ?? null,
  faviconImageUrl: settings.faviconImageUrl ?? null,
  backgroundImageUrl: settings.backgroundImageUrl ?? null,
  backgroundImageAttachment: settings.backgroundImageAttachment ?? backgroundImageAttachments.defaultValue,
  backgroundImageRepeat: settings.backgroundImageRepeat ?? backgroundImageRepeats.defaultValue,
  backgroundImageSize: settings.backgroundImageSize ?? backgroundImageSizes.defaultValue,
  primaryColor: settings.primaryColor,
  secondaryColor: settings.secondaryColor,
  opacity: settings.opacity,
  customCss: settings.customCss ?? null,
  iconColor: settings.iconColor ?? null,
  itemRadius: settings.itemRadius,
  disableStatus: settings.disableStatus ?? false,
});
