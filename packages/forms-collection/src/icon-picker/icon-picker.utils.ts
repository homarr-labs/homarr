import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@homarr/api";

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
      const aRank = getMatchRank(normalizedSearch, a.name || a.url) ?? Number.MAX_SAFE_INTEGER;
      const bRank = getMatchRank(normalizedSearch, b.name || b.url) ?? Number.MAX_SAFE_INTEGER;
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

export const findBestIconMatch = (searchTerm: string, iconGroups: IconGroup[]): string | null => {
  const normalizedSearch = normalizeImageName(searchTerm);
  if (!normalizedSearch) return null;

  const rankedIcons = iconGroups
    .flatMap((group) =>
      group.icons.map((icon) => ({
        icon,
        group,
        rank: getMatchRank(normalizedSearch, icon.name || icon.url),
      })),
    )
    .filter((entry) => entry.rank !== null)
    .toSorted((a, b) => {
      const quality = (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
      if (quality !== 0) return quality;

      const local = Number(b.group.slug === "local") - Number(a.group.slug === "local");
      if (local !== 0) return local;

      const svg = Number(isSvgImage(b.icon.url)) - Number(isSvgImage(a.icon.url));
      if (svg !== 0) return svg;

      return (
        normalizeImageName(a.icon.name || a.icon.url).length - normalizeImageName(b.icon.name || b.icon.url).length
      );
    });

  return rankedIcons.at(0)?.icon.url ?? null;
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

const normalizeImageName = (value: string) => {
  const fileName = value.split(/[?#]/, 1)[0]?.split("/").pop() ?? value;
  const withoutExtension = fileName.replace(/\.(?:avif|gif|jpe?g|png|svg|webp)$/i, "");

  return withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
};

const getMatchRank = (search: string, candidateValue: string): number | null => {
  const candidate = normalizeImageName(candidateValue);
  if (!candidate) return null;

  const compactSearch = search.replaceAll(" ", "");
  const compactCandidate = candidate.replaceAll(" ", "");
  if (candidate === search) return 0;
  if (compactCandidate === compactSearch) return 1;
  if (candidate.startsWith(`${search} `)) return 2;

  const searchTokens = search.split(" ");
  const candidateTokens = candidate.split(" ");
  if (searchTokens.every((term) => candidateTokens.some((token) => token === term))) return 3;
  if (searchTokens.every((term) => candidateTokens.some((token) => token.startsWith(term)))) return 4;
  if (candidate.includes(search)) return 5;
  return null;
};
