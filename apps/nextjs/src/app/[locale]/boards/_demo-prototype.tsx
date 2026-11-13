"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionIcon, Group, Paper, Text, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

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

// Two refined native demo boards; the original five proposals remain in the historical report.
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
  const candidate = candidates?.find(({ proposal }) => proposal.key === searchParams.get("variant")) ?? candidates?.[0];
  const board = candidate?.board ?? initialBoard;
  useEffect(() => {
    if (!candidate || searchParams.get("variant") === candidate.proposal.key) return;
    const params = new URLSearchParams(searchParams);
    params.set("variant", candidate.proposal.key);
    params.delete("tab");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [candidate, pathname, router, searchParams]);
  const changeVariant = useCallback(
    (offset: number) => {
      if (!candidate || !candidates) return;
      const index = candidates.indexOf(candidate);
      const next = candidates[(index + offset + candidates.length) % candidates.length];
      if (!next) return;
      const params = new URLSearchParams(searchParams);
      params.set("variant", next.proposal.key);
      params.delete("tab");
      params.delete("edit");
      params.delete("layout");
      router.replace(`${pathname}?${params}`, { scroll: true });
    },
    [candidate, candidates, pathname, router, searchParams],
  );
  useEffect(() => {
    if (!candidate) return;
    console.info("Homarr demo prototype state", { boardId: candidate.board.id, ...candidate.proposal });
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable], [role=slider], [role=spinbutton], [role=tablist], [role=menu], [role=dialog], [role=combobox], [role=listbox]",
        )
      )
        return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      let offset = 1;
      if (event.key === "ArrowLeft") offset = -1;
      changeVariant(offset);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [candidate, changeVariant]);
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
        {process.env.NODE_ENV !== "production" && candidate && (
          <Paper
            component="nav"
            aria-label="Throwaway demo proposals"
            pos="fixed"
            bottom={16}
            left="50%"
            p="xs"
            radius="xl"
            shadow="xl"
            withBorder
            style={{ transform: "translateX(-50%)", zIndex: 10000, maxWidth: "calc(100vw - 24px)" }}
          >
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                size="lg"
                variant="default"
                radius="xl"
                aria-label="Previous demo proposal"
                onClick={() => changeVariant(-1)}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Tooltip label={candidate.proposal.question} withArrow>
                <Text ta="center" size="sm" fw={600} truncate aria-live="polite">
                  {candidate.proposal.key} · {candidate.proposal.name}
                  <Text component="span" display="block" size="xs" fw={400} c="dimmed">
                    Iteration 2 · unscored · ← / → compare
                  </Text>
                </Text>
              </Tooltip>
              <ActionIcon
                size="lg"
                variant="default"
                radius="xl"
                aria-label="Next demo proposal"
                onClick={() => changeVariant(1)}
              >
                <IconArrowRight size={18} />
              </ActionIcon>
            </Group>
          </Paper>
        )}
      </BoardProviders>
    </DemoPrototypeContext.Provider>
  );
};
