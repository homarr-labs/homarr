"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { demoPrototypes } from "@homarr/db/demo-prototypes";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";

import { DemoPrototypeContext } from "~/components/board/demo-prototype-context";
import type { Board } from "./_types";
import { BoardProviders } from "./_providers";

type Proposal = (typeof demoPrototypes)[number];
export interface DemoPrototypeCandidate {
  board: Board;
  proposal: Proposal;
}

// The selected native showcase; prior proposals remain in the historical report.
export const DemoPrototypeHost = ({
  children,
  candidates,
  initialBoard,
  initialLayoutId,
  initialViewportWidth,
  canModify,
}: PropsWithChildren<{
  candidates: DemoPrototypeCandidate[] | null;
  initialBoard: Board;
  initialLayoutId: string;
  initialViewportWidth: number;
  canModify: boolean;
}>) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const candidate = candidates?.[0];
  const board = candidate?.board ?? initialBoard;
  useEffect(() => {
    if (!candidate || searchParams.get("variant") === candidate.proposal.key) return;
    const params = new URLSearchParams(searchParams);
    params.set("variant", candidate.proposal.key);
    params.delete("tab");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [candidate, pathname, router, searchParams]);
  return (
    <DemoPrototypeContext.Provider
      value={candidate ? { headerPreferences: candidate.proposal.headerPreferences } : null}
    >
      <BoardProviders
        key={board.id}
        initialBoard={board}
        initialLayoutId={candidate ? getLayoutIdForViewportWidth(board.layouts, initialViewportWidth) : initialLayoutId}
        initialViewportWidth={initialViewportWidth}
        canModify={canModify}
      >
        {children}
      </BoardProviders>
    </DemoPrototypeContext.Provider>
  );
};
