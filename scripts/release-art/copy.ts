import type { RenderItem } from "./types";

export const firstSentence = (value: string) => {
  const flat = value.replace(/\s+/g, " ").trim();
  return /^.+?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat;
};

export const tileText = (item: RenderItem) => item.oneLiner || firstSentence(item.description);

export const monogramLetter = (name: string) => /[\p{L}\p{N}]/u.exec(name)?.[0]?.toUpperCase() ?? "?";

const noun = (count: number, singular: string) => {
  if (count === 1) return singular;
  return `${singular}s`;
};

export interface Copy {
  integrations: number;
  widgets: number;
  single: string;
  lines: [string, string];
  eyebrow: string;
  version: string;
}

export const buildCopy = (items: RenderItem[], rawVersion: string): Copy => {
  const version = rawVersion.replace(/^v/, "");
  const integrations = items.filter((item) => item.kind === "integration").length;
  const widgets = items.length - integrations;
  const ints = `${integrations} new ${noun(integrations, "integration")}`;
  const wids = `${widgets} new ${noun(widgets, "widget")}`;
  const only = items[0];
  if (integrations > 0 && widgets > 0) {
    return {
      integrations,
      widgets,
      single: `${ints} & ${wids}`,
      lines: [ints, `& ${wids}`],
      eyebrow: `WHAT'S NEW · ${version}`,
      version,
    };
  }
  if (widgets === 1 && only) {
    return {
      integrations,
      widgets,
      single: `New widget: ${only.name}`,
      lines: ["New widget", only.name],
      eyebrow: `NEW WIDGET · ${version}`,
      version,
    };
  }
  if (widgets > 1) {
    return {
      integrations,
      widgets,
      single: wids,
      lines: [`${widgets} new`, "widgets"],
      eyebrow: `NEW WIDGETS · ${version}`,
      version,
    };
  }
  return {
    integrations,
    widgets,
    single: ints,
    lines: [`${integrations} new`, noun(integrations, "integration")],
    eyebrow: `NEW INTEGRATIONS · ${version}`,
    version,
  };
};
