"use client";

import type { PropsWithChildren } from "react";

import { DayJsLocaleContext } from "@homarr/common";
import { useSuspenseDayJsLocalization } from "@homarr/translation/dayjs";

export const DayJsLoader = ({ children }: PropsWithChildren) => {
  const locale = useSuspenseDayJsLocalization();

  return <DayJsLocaleContext.Provider value={locale}>{children}</DayJsLocaleContext.Provider>;
};
