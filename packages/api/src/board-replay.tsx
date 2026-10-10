"use client";

import { createContext, useContext } from "react";

// Allows widgets with local or imperative data sources to use the replay cache.
const BoardReplayContext = createContext(false);
export const BoardReplayProvider = BoardReplayContext.Provider;
export const useBoardReplay = () => useContext(BoardReplayContext);
