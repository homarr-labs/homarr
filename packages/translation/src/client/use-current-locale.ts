import { useLocale } from "next-intl";

import type { SupportedLanguage } from "../config";

export const useCurrentLocale = () => useLocale() as SupportedLanguage;
