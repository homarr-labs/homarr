import type { PropsWithChildren } from "react";
import { Provider } from "jotai";

export function SourceJotaiProvider({ children }: PropsWithChildren) {
  return <Provider>{children}</Provider>;
}
