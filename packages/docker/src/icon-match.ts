import { getImageMatchRank, normalizeImageName } from "@homarr/common";

export const getContainerImageIconFallback = <TIcon extends { name: string }>(imageName: string, icons: TIcon[]) => {
  const tokens = imageName.split(/[-_.]+/);
  while (tokens.length > 0) {
    const candidate = normalizeImageName(tokens.join("-"));
    if (
      candidate.length >= 3 &&
      !/^(?:api|app|cache|code|container|docker|file|home|linux|machine|node|open|server|service|test|web|worker)$/.test(
        candidate,
      )
    ) {
      for (const rank of [0, 1]) {
        const match = icons.find((icon) => getImageMatchRank(candidate, icon.name) === rank);
        if (match) return match;
      }
    }

    const suffix = tokens.at(-1) ?? "";
    if (!/^(?:agent|node|server|worker|machine|learning|web|app|\d+(?:k|p)?)$/i.test(suffix)) break;
    tokens.pop();
  }

  return null;
};
