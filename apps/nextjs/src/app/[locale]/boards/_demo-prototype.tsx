"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionIcon, Affix, Box, Group, Paper, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
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

// Two versions of the current demo's native board, switchable on the same route with ?variant=A|B.
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
  const selectVariant = (direction: number, event?: KeyboardEvent) => {
    if (!candidate || !candidates) return;
    if (
      event?.target instanceof Element &&
      event.target.closest(
        "input, textarea, select, button, a, summary, [contenteditable], [tabindex], [role=slider], [role=tablist], [role=button], [role=switch], [role=checkbox], [role=radio], [role=combobox]",
      )
    )
      return;
    event?.preventDefault();
    const index = candidates.indexOf(candidate);
    const next = candidates[(index + direction + candidates.length) % candidates.length]!;
    const params = new URLSearchParams(searchParams);
    params.set("variant", next.proposal.key);
    params.delete("tab");
    router.replace(`${pathname}?${params}`, { scroll: false });
    console.info("Demo prototype", {
      variant: next.proposal.key,
      name: next.proposal.name,
      tabs: next.proposal.tabs.map(({ name }) => name),
    });
  };
  useHotkeys([
    ["ArrowLeft", (event) => selectVariant(-1, event), { preventDefault: false }],
    ["ArrowRight", (event) => selectVariant(1, event), { preventDefault: false }],
  ]);
  useEffect(() => {
    if (!candidate || searchParams.get("variant") === candidate.proposal.key) return;
    const params = new URLSearchParams(searchParams);
    params.set("variant", candidate.proposal.key);
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
        {process.env.NODE_ENV !== "production" && candidate && candidates && <Box h={80} aria-hidden />}
        {process.env.NODE_ENV !== "production" && candidate && candidates && (
          <Affix position={{ bottom: 16, left: "50%" }} style={{ transform: "translateX(-50%)" }}>
            <Paper p={6} radius="xl" shadow="md" withBorder bg="var(--mantine-color-dark-8)" c="white">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  aria-label="Previous layout"
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  onClick={() => selectVariant(-1)}
                >
                  <IconArrowLeft size={16} />
                </ActionIcon>
                <Text size="xs" fw={600} style={{ whiteSpace: "nowrap" }}>
                  {candidate.proposal.key} · {candidate.proposal.name}
                </Text>
                <ActionIcon
                  aria-label="Next layout"
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  onClick={() => selectVariant(1)}
                >
                  <IconArrowRight size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          </Affix>
        )}
      </BoardProviders>
    </DemoPrototypeContext.Provider>
  );
};
