"use client";

import { useMediaQuery } from "@mantine/hooks";

export const mobileBoardMediaQuery = "(max-width: 48em)";

export const useIsMobileBoard = () => useMediaQuery(mobileBoardMediaQuery);
