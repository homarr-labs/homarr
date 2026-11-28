import { createContext, useContext } from "react";

export interface WidgetContentSize {
  width: number;
  height: number;
}

/**
 * The size the edited widget has on the board, as the edit dialog's preview shows it. Settings that lay out the
 * widget's content (the smart home layout editor) use it, also for a widget that is not on the board yet.
 */
export const WidgetPreviewSizeContext = createContext<{
  size: WidgetContentSize | null;
  setSize: (size: WidgetContentSize) => void;
} | null>(null);

export const useWidgetPreviewSize = () => useContext(WidgetPreviewSizeContext)?.size ?? null;
