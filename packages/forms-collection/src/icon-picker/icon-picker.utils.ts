import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@homarr/api";
import { getImageMatchRank, normalizeImageName } from "@homarr/common";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type IconGroup = RouterOutput["icon"]["findIcons"]["icons"][number];
export type PickerIcon = IconGroup["icons"][number] & { repositorySlug: string };

export interface IconPickerSections {
  local: PickerIcon[];
  svg: PickerIcon[];
  other: PickerIcon[];
}

export const arrangeIconPickerSections = (iconGroups: IconGroup[], searchTerm = ""): IconPickerSections => {
  const sections: IconPickerSections = { local: [], svg: [], other: [] };

  for (const group of iconGroups) {
    for (const icon of group.icons) {
      const pickerIcon = { ...icon, repositorySlug: group.slug };
      if (group.slug === "local") {
        sections.local.push(pickerIcon);
      } else if (isSvgImage(icon.url)) {
        sections.svg.push(pickerIcon);
      } else {
        sections.other.push(pickerIcon);
      }
    }
  }

  const normalizedSearch = normalizeImageName(searchTerm);
  if (normalizedSearch) {
    const compareMatches = (a: PickerIcon, b: PickerIcon) => {
      const aRank = getImageMatchRank(normalizedSearch, a.name || a.url) ?? Number.MAX_SAFE_INTEGER;
      const bRank = getImageMatchRank(normalizedSearch, b.name || b.url) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.name.localeCompare(b.name);
    };
    return {
      local: sections.local.toSorted(compareMatches),
      svg: sections.svg.toSorted(compareMatches),
      other: sections.other.toSorted(compareMatches),
    };
  }

  return sections;
};

export const isDirectImageUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const isImageSource = (value: string) => isDirectImageUrl(value) || value.trim().startsWith("/");

export const isSvgImage = (value: string) => {
  try {
    const url = new URL(value, "http://homarr.local");
    return url.pathname.toLowerCase().endsWith(".svg");
  } catch {
    return value.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(".svg") ?? false;
  }
};
