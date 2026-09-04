import { createContext, useContext } from "react";

import { HERMES_BRAND_THEME } from "./theme-data";
import type { HermesTheme } from "./theme-data";

export type { HermesTheme } from "./theme-data";

export const HermesThemeContext = createContext<HermesTheme>(HERMES_BRAND_THEME);

export const useHermesTheme = () => useContext(HermesThemeContext);

export const HERMES_CHROME_TEXT_STYLE = {
  fontFamily: "var(--hermes-agent-font-sans)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

export const HERMES_TECHNICAL_TEXT_STYLE = {
  fontFamily: "var(--hermes-agent-font-mono)",
  fontVariantNumeric: "tabular-nums",
} as const;
