"use client";

import { createContext, useContext } from "react";

import type { BoardEditingControls } from "~/app/[locale]/boards/(content)/_editing-provider";

export const BoardEditingContext = createContext<BoardEditingControls | null>(null);
export const useOptionalBoardEditing = () => useContext(BoardEditingContext);
