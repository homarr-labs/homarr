"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, Paper, Progress, SegmentedControl, Stack, Text, Title } from "@mantine/core";

import { revealArena } from "./_actions";
import { ARENA_STATES, ARENA_VIEWPORTS } from "./_arena-contract";
import type { ArenaState, ArenaViewport } from "./_arena-contract";
import { answerableMatches, makeVote, nextMatch, validateReview } from "./_review";
import type { ArenaReveal, ArenaReview, ArenaVote, BlindDataset } from "./_review";
import { WidgetFrame } from "./_widget-frame";

function emptyReview(hash: string): ArenaReview {
  return { version: 1, datasetHash: hash, sessionId: crypto.randomUUID(), revealed: false, votes: [], unavailable: [] };
}

export function Arena({ dataset }: { dataset: BlindDataset }) {
  const router = useRouter();
  const storageKey = `homarr:arena:v1:${dataset.hash}:${dataset.reviewer}`;
  const [review, setReview] = useState<ArenaReview | null>(null);
  const [storageError, setStorageError] = useState("");
  const [invalidStorage, setInvalidStorage] = useState(false);
  const [state, setState] = useState<ArenaState>("success");
  const [viewport, setViewport] = useState<ArenaViewport>("narrow");
  const [reveal, setReveal] = useState<ArenaReveal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    let saved: string | null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      setStorageError(
        "Browser storage is unavailable. This review is in memory only; export it before leaving. Reveal requires working storage.",
      );
      setReview(emptyReview(dataset.hash));
      return;
    }
    if (saved === null) {
      setReview(emptyReview(dataset.hash));
      return;
    }
    try {
      setReview(validateReview(JSON.parse(saved), dataset));
    } catch {
      setStorageError(
        "The saved review could not be validated. It has not been overwritten. Reset explicitly to start a new review.",
      );
      setInvalidStorage(true);
      setReview(emptyReview(dataset.hash));
    }
  }, [dataset, storageKey]);
  useEffect(() => {
    const syncReview = (event: StorageEvent) => {
      if (event.key !== storageKey || event.newValue === null) return;
      try {
        setReview(validateReview(JSON.parse(event.newValue), dataset));
      } catch {
        setInvalidStorage(true);
        setStorageError("Another tab saved an invalid review. Reset explicitly to start a new review.");
      }
    };
    window.addEventListener("storage", syncReview);
    return () => window.removeEventListener("storage", syncReview);
  }, [dataset, storageKey]);
  const persist = useCallback(
    (next: ArenaReview) => {
      setReview(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setStorageError("");
        return true;
      } catch {
        setStorageError(
          "Browser storage could not save this review. Export it before leaving. Reveal requires working storage.",
        );
        return false;
      }
    },
    [storageKey],
  );
  const pending = dataset.candidates.filter(({ status }) => status === "pending").length;
  const failed = dataset.candidates.filter(({ status }) => status === "invalid").length;
  const match = nextMatch(dataset, review?.votes ?? [], review?.unavailable ?? []);
  const fixture = dataset.cases.find(({ id }) => id === match?.caseId);
  const left = dataset.candidates.find(({ id }) => id === match?.leftId);
  const right = dataset.candidates.find(({ id }) => id === match?.rightId);
  const runtimeUnavailable = Boolean(match && review?.unavailable.includes(match.id));
  const unavailable =
    runtimeUnavailable ||
    left?.status !== "ready" ||
    right?.status !== "ready" ||
    !left.definition ||
    !right.definition;
  const canVote = Boolean(review && !review.revealed && !invalidStorage && pending === 0 && match);
  const choose = useCallback(
    (choice: ArenaVote["choice"]) => {
      if (!review || !match || !canVote || (unavailable && choice !== "skip")) return;
      persist({ ...review, votes: [...review.votes, makeVote(match, choice, state, viewport)] });
    },
    [canVote, match, persist, review, state, unavailable, viewport],
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          target.closest(
            "input, textarea, select, button, a, [contenteditable=true], [role=combobox], [role=slider], [role=switch]",
          ))
      )
        return;
      if (event.key === "1") {
        event.preventDefault();
        choose("left");
      }
      if (event.key === "2") {
        event.preventDefault();
        choose("right");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choose]);
  const reportFailure = useCallback(() => {
    if (!review || !match || invalidStorage || review.unavailable.includes(match.id)) return;
    persist({ ...review, unavailable: [...review.unavailable, match.id] });
  }, [invalidStorage, match, persist, review]);
  const revealResults = async () => {
    if (!review || busy || invalidStorage || pending > 0 || dataset.smoke) return;
    if (
      !review.revealed &&
      !window.confirm(
        "Reveal prompt identities and end blind collection? You cannot add or undo votes afterward. A reset starts a clearly new review.",
      )
    )
      return;
    const next = { ...review, revealed: true };
    if (!persist(next)) {
      setError("Reveal was not requested because the end of blind collection could not be saved.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setReveal(await revealArena(next));
    } catch {
      setError("Results are unavailable. Blind collection has ended; you can retry reveal or export your review.");
    } finally {
      setBusy(false);
    }
  };
  const exportReview = () => {
    if (!review) return;
    const payload = {
      ...review,
      order: dataset.matches.map(({ id, caseId, leftId, rightId }) => ({ id, caseId, leftId, rightId })),
      coverage: dataset.candidates.map(({ id, caseId, status }) => ({ id, caseId, status })),
      reveal,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `widget-arena-${review.sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const reset = () => {
    if (
      !window.confirm(
        "Start a new review? This clears the current local vote history and any revealed identities for this browser. Export first if you want to keep it.",
      )
    )
      return;
    setInvalidStorage(false);
    setReveal(null);
    setError("");
    persist(emptyReview(dataset.hash));
    setResetKey((value) => value + 1);
  };
  if (!review) return <Text c="dimmed">Loading your local review…</Text>;
  const available = answerableMatches(dataset, review.unavailable);
  const answerable = available.length;
  const answered = review.votes.filter(({ choice }) => choice !== "skip").length;
  const skipped = review.votes.filter(
    (vote) => vote.choice === "skip" && available.some((entry) => entry.id === vote.matchId),
  ).length;
  const unavailableMatches = dataset.matches.filter(
    (entry) =>
      review.unavailable.includes(entry.id) ||
      [entry.leftId, entry.rightId].some(
        (id) => dataset.candidates.find((candidate) => candidate.id === id)?.status === "invalid",
      ),
  ).length;
  return (
    <Stack gap="lg" miw={0}>
      <Stack gap={6}>
        <Group justify="space-between" align="start">
          <Box>
            <Title order={2}>Which would you keep?</Title>
            <Text size="sm" c="dimmed">
              Try both widgets, then choose. Identities stay hidden until you reveal.
            </Text>
          </Box>
          <Text size="sm" fw={600} aria-live="polite">
            {answered} / {answerable} choices
          </Text>
        </Group>
        <Progress
          value={answerable > 0 ? (answered / answerable) * 100 : 0}
          size="xs"
          aria-label="Answered usable comparisons"
        />
        <Text size="xs" c="dimmed">
          {dataset.matches.length} scheduled · {unavailableMatches} unavailable (not ranked) · {skipped} skipped ·{" "}
          {dataset.candidates.length - pending} / {dataset.candidates.length} generations finished ({failed} invalid)
        </Text>
      </Stack>
      {dataset.smoke && (
        <Text c="orange" size="sm">
          Hand-authored runtime smoke. Local choices are isolated from the 60 model outputs and never included in
          rankings.
        </Text>
      )}
      {storageError && (
        <Text c="orange" size="sm" role="alert">
          {storageError}
        </Text>
      )}
      {error && (
        <Text c="red" size="sm" role="alert">
          {error}
        </Text>
      )}
      {pending > 0 && (
        <Paper withBorder p="lg" radius="md">
          <Stack gap="sm">
            <Text>Generation is in progress. Voting opens when all 60 attempts are finished.</Text>
            <Button variant="default" onClick={() => router.refresh()}>
              Refresh dataset
            </Button>
          </Stack>
        </Paper>
      )}
      {review.revealed ? (
        <Stack>
          <Title order={3}>Blind collection has ended</Title>
          <Text size="sm" c="dimmed">
            These are descriptive personal preferences, not measured quality or statistical significance. Elo starts at
            1000 with K = 32. Skips and unavailable comparisons are not ranked.
          </Text>
          {!reveal && (
            <Button variant="default" loading={busy} onClick={() => void revealResults()}>
              Load revealed results
            </Button>
          )}
          {reveal?.conditions.map((condition) => (
            <Paper key={condition.id} p="md" withBorder radius="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700}>{condition.name}</Text>
                  <Text>
                    {condition.score.toFixed(1)} Elo · {condition.judgments} judgments
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                  SHA-256 {condition.hash}
                </Text>
                <details>
                  <summary>Exact prompt</summary>
                  <Text component="pre" size="xs" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {condition.prompt}
                  </Text>
                </details>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <>
          {match && fixture && left && right && pending === 0 ? (
            <Stack gap="md">
              <Paper withBorder p="md" radius="md">
                <Text fw={600}>{fixture.title}</Text>
                <Text size="sm" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                  {fixture.prompt.split(". ")[0]}
                </Text>
                {fixture.prompt.includes(". ") && (
                  <details>
                    <summary>Full task</summary>
                    <Text size="sm" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                      {fixture.prompt}
                    </Text>
                  </details>
                )}
              </Paper>
              <Group justify="space-between" gap="sm">
                <Group gap="xs">
                  <SegmentedControl
                    aria-label="Widget dimensions"
                    size="xs"
                    value={viewport}
                    data={ARENA_VIEWPORTS.map(({ id, width, height }) => ({
                      value: id,
                      label: `${width} × ${height}`,
                    }))}
                    onChange={(value) => {
                      if (value === "wide" || value === "narrow") setViewport(value);
                    }}
                  />
                  <SegmentedControl
                    aria-label="Simulation state"
                    size="xs"
                    value={state}
                    data={ARENA_STATES.map((value) => ({ value, label: value === "success" ? "Normal" : value }))}
                    onChange={(value) => {
                      if (ARENA_STATES.some((entry) => entry === value)) setState(value as ArenaState);
                    }}
                  />
                </Group>
                <Button size="compact-xs" variant="subtle" onClick={() => setResetKey((value) => value + 1)}>
                  Reset simulation
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Simulated data · fixed clock · refresh and actions stay local. No live services.
              </Text>
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${(ARENA_VIEWPORTS.find(({ id }) => id === viewport)?.width ?? 640) + 2}px), ${(ARENA_VIEWPORTS.find(({ id }) => id === viewport)?.width ?? 640) + 2}px))`,
                  justifyContent: "center",
                  gap: "var(--mantine-spacing-md)",
                  minWidth: 0,
                }}
              >
                {[
                  { candidate: left, label: "THIS", choice: "left" as const },
                  { candidate: right, label: "THAT", choice: "right" as const },
                ].map(({ candidate, label, choice }) => (
                  <Stack key={label} gap="sm" miw={0}>
                    <Text size="xs" fw={700} c="dimmed">
                      {label}
                    </Text>
                    <Paper withBorder radius="md" style={{ overflow: "auto", minWidth: 0 }}>
                      {runtimeUnavailable ? (
                        <Box p="lg" h={ARENA_VIEWPORTS.find(({ id }) => id === viewport)?.height}>
                          <Text c="dimmed">
                            Candidate unavailable. This comparison is retained but cannot be ranked.
                          </Text>
                        </Box>
                      ) : (
                        <WidgetFrame
                          key={`${match.id}:${state}:${viewport}:${resetKey}:${candidate.id}`}
                          candidate={candidate}
                          fixture={fixture}
                          state={state}
                          viewport={viewport}
                          onFailure={reportFailure}
                        />
                      )}
                    </Paper>
                    <Button
                      size="lg"
                      fullWidth
                      variant="light"
                      disabled={!canVote || unavailable}
                      onClick={() => choose(choice)}
                    >
                      Keep {label.toLowerCase()}
                    </Button>
                  </Stack>
                ))}
              </Box>
              <Group justify="center">
                <Button variant="default" disabled={!canVote || unavailable} onClick={() => choose("tie")}>
                  Both equally
                </Button>
                <Button variant="subtle" disabled={!canVote} onClick={() => choose("skip")}>
                  Skip
                </Button>
              </Group>
              <Text size="xs" c="dimmed" ta="center">
                Keys 1 / 2 choose this / that when no widget control is focused.
              </Text>
            </Stack>
          ) : (
            pending === 0 && (
              <Paper withBorder p="lg" radius="md">
                <Stack>
                  <Title order={3}>All usable comparisons reviewed</Title>
                  <Text>
                    {answered} answered, {skipped} skipped. {unavailableMatches} of {dataset.matches.length} scheduled
                    comparisons are unavailable and remain unranked. Skips are not votes.
                  </Text>
                  <Button
                    variant="default"
                    disabled={skipped === 0 || invalidStorage}
                    onClick={() =>
                      persist({
                        ...review,
                        votes: review.votes.filter(
                          (vote) => vote.choice !== "skip" || !available.some((entry) => entry.id === vote.matchId),
                        ),
                      })
                    }
                  >
                    Revisit skipped comparisons
                  </Button>
                </Stack>
              </Paper>
            )
          )}
        </>
      )}
      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          <Button
            variant="default"
            size="xs"
            disabled={review.revealed || review.votes.length === 0 || invalidStorage}
            onClick={() => persist({ ...review, votes: review.votes.slice(0, -1) })}
          >
            Undo last choice
          </Button>
          <Button variant="subtle" size="xs" onClick={exportReview}>
            Export JSON
          </Button>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" size="xs" color="gray" onClick={reset}>
            New review
          </Button>
          {!review.revealed && !dataset.smoke && (
            <Button
              variant="default"
              size="xs"
              disabled={pending > 0 || invalidStorage}
              loading={busy}
              onClick={() => void revealResults()}
            >
              Reveal and end collection
            </Button>
          )}
        </Group>
      </Group>
      <Text size="xs" c="dimmed">
        Single-reviewer history is stored only in this browser. Export to keep a copy. Resetting starts a new review,
        not a continuation of blind collection.
      </Text>
    </Stack>
  );
}
