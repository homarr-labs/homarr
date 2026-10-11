import { lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, SimpleGrid, Stack, Button, Text } from "@mantine/core";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import "@mantine/core/styles.css";

const baselinePath =
  "/home/habs/.codex/worktrees/5fcf/homarr/audit-evidence/2026-10-11/baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx";
const params = new URLSearchParams(window.location.search);
const variant = params.get("variant") === "candidate" ? "candidate" : "baseline";
const boardCount = Number(params.get("size") ?? 1);
const canCreate = params.get("permission") !== "none";

const BaselineBoardCard = lazy(() =>
  import("/home/habs/.codex/worktrees/5fcf/homarr/audit-evidence/2026-10-11/baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx?baseline").then(
    (module) => ({ default: module.BoardCard }),
  ),
);
const CandidateBoardCard = lazy(() =>
  import("/home/habs/.codex/worktrees/5fcf/homarr/audit-evidence/2026-10-11/baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx?candidate").then(
    (module) => ({ default: module.BoardCard }),
  ),
);
const BoardCard = variant === "candidate" ? CandidateBoardCard : BaselineBoardCard;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

declare global {
  interface Window {
    __boardAudit: {
      queryClient: QueryClient;
    mutationCalls: unknown[];
    transitions: { type: string; property: string; elapsedTime: number }[];
    boardCount: number;
      variant: string;
    };
  }
}

function Catalog() {
  const [mounted, setMounted] = useState(true);
  const client = useQueryClient();

  return (
    <Stack p="md">
      <Text>
        {variant} / {boardCount} synthetic boards / {canCreate ? "board-create" : "no board-create"}
      </Text>
      <Button data-testid="navigate-away" onClick={() => setMounted(false)}>
        Navigate away
      </Button>
      {!mounted && (
        <Button data-testid="navigate-back" onClick={() => setMounted(true)}>
          Return to catalog
        </Button>
      )}
      {mounted && (
        <Suspense fallback={<Text>Loading isolated BoardCard module</Text>}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {Array.from({ length: boardCount }, (_, index) => {
              const id = `synthetic-board-${index + 1}`;
              const board = {
                id,
                name: `Board-${index + 1}`,
                preview: null,
                creator: null,
                userPermissions: [],
                groupPermissions: [],
                isPublic: false,
                isHome: false,
                isMobileHome: false,
              };
              return (
                <div key={id} data-testid={`board-card-${index}`}>
                  <BoardCard
                    board={board as never}
                    isMenuVisible
                    labels={{
                      visibility: "Visibility",
                      preview: `Preview ${board.name}`,
                      unknownCreator: "Unknown creator",
                      home: "Home",
                      homeTooltip: "Home board",
                      mobileHome: "Mobile home",
                      mobileHomeTooltip: "Mobile home board",
                      open: "Open",
                      settings: "Settings",
                    }}
                  />
                </div>
              );
            })}
          </SimpleGrid>
        </Suspense>
      )}
      <output data-testid="query-count" hidden>
        {client.getQueryCache().getAll().filter((query) => query.queryKey[0] === "board.exists").length}
      </output>
    </Stack>
  );
}

window.__boardAudit = {
  queryClient,
  mutationCalls: [],
  transitions: [],
  boardCount,
  variant,
};

document.addEventListener("transitionrun", (event) => {
  if (event.target instanceof HTMLElement) {
    window.__boardAudit.transitions.push({
      type: event.type,
      property: (event as TransitionEvent).propertyName,
      elapsedTime: (event as TransitionEvent).elapsedTime,
    });
  }
});
document.addEventListener("transitionend", (event) => {
  if (event.target instanceof HTMLElement) {
    window.__boardAudit.transitions.push({
      type: event.type,
      property: (event as TransitionEvent).propertyName,
      elapsedTime: (event as TransitionEvent).elapsedTime,
    });
  }
});

createRoot(document.getElementById("root")!).render(
  <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <Catalog />
    </QueryClientProvider>
  </MantineProvider>,
);
