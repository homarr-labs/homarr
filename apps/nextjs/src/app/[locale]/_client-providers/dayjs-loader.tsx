"use client";

import { useSuspenseDayJsLocalization } from "@homarr/translation/dayjs";
import type { PropsWithChildren } from "react";

export const DayJsLoader = ({ children }: PropsWithChildren) => {
  // Load the dayjs localization for the current locale with suspense
  useSuspenseDayJsLocalization();

  return children;
};
