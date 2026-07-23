import type { PropsWithChildren } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function BoardsLayout({ children }: PropsWithChildren) {
  return children;
}
