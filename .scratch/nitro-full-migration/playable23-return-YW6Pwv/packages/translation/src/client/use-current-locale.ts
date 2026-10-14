import { useLocale } from "next-intl";

import { getIntlLocale } from "../config";

export const useCurrentLocale = useLocale;

export const useCurrentIntlLocale = () => getIntlLocale(useLocale());
