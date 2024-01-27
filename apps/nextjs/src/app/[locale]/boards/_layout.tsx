/**
 * This file is named _layout.tsx because it's kind of a shared layout between the default and name route,
 * but it has to be wrapped with the board provider which is why it's not possible to just define the layout route.
 */

import type { PropsWithChildren } from "react";

import type { RouterOutputs } from "@homarr/api";
import { AppShellMain } from "@homarr/ui";

import { MainHeader } from "~/components/layout/header";
import { ClientShell } from "~/components/layout/shell";
import { BoardProvider } from "./_context";

import "../../../styles/gridstack.scss";

type Props = PropsWithChildren<{
  initialBoard: RouterOutputs["board"]["default"];
}>;

export function BoardLayout({ children, initialBoard }: Props) {
  return (
    <BoardProvider initialBoard={initialBoard}>
      <ClientShell hasNavigation={false}>
        <MainHeader />
        <AppShellMain>{children}</AppShellMain>
      </ClientShell>
    </BoardProvider>
  );
}
