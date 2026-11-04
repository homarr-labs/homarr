import type { ThemeId } from "@homarr/definitions";

import type { ThemePreset } from "./types";
import absolutely from "./presets/absolutely";
import ayu from "./presets/ayu";
import cappuccin from "./presets/cappuccin";
import dracula from "./presets/dracula";
import everforest from "./presets/everforest";
import github from "./presets/github";
import gruvbox from "./presets/gruvbox";
import linear from "./presets/linear";
import lobster from "./presets/lobster";
import material from "./presets/material";
import matrix from "./presets/matrix";
import monokai from "./presets/monokai";
import nightOwl from "./presets/night-owl";
import nord from "./presets/nord";
import notion from "./presets/notion";
import og from "./presets/og";
import one from "./presets/one";
import oscurange from "./presets/oscurange";
import raycast from "./presets/raycast";
import rosePine from "./presets/rose-pine";
import sentry from "./presets/sentry";
import shadcn from "./presets/shadcn";
import solarized from "./presets/solarized";
import temple from "./presets/temple";
import tokyoNight from "./presets/tokyo-night";
import vercel from "./presets/vercel";
import vscodePlus from "./presets/vscode-plus";
import xcode from "./presets/xcode";

// The default theme intentionally leaves Homarr branding and board colors in control.
export const themePresets = {
  absolutely,
  ayu,
  cappuccin,
  dracula,
  everforest,
  github,
  gruvbox,
  linear,
  lobster,
  material,
  matrix,
  monokai,
  "night-owl": nightOwl,
  nord,
  notion,
  og,
  one,
  oscurange,
  raycast,
  "rose-pine": rosePine,
  sentry,
  shadcn,
  solarized,
  temple,
  "tokyo-night": tokyoNight,
  vercel,
  "vscode-plus": vscodePlus,
  xcode,
} satisfies Record<Exclude<ThemeId, "default">, ThemePreset>;

export const getThemePreset = (id: ThemeId): ThemePreset | undefined => {
  if (id === "default") return undefined;
  return themePresets[id];
};
