import { describe, expect, it } from "vitest";

import {
  createTimerRuntime,
  getRemainingMs,
  isTimerRuntimeState,
  pauseTimerRuntime,
  reconcileTimerRuntime,
  startTimerRuntime,
  synchronizeTimerRuntime,
} from "./runtime";

const durations = {
  timerMinutes: 10,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 2,
  autoStartBreaks: false,
  autoStartFocus: false,
};

describe("timer runtime", () => {
  it("uses a persisted deadline and preserves a paused remainder", () => {
    const initial = createTimerRuntime("timer", durations);
    const running = startTimerRuntime(initial, 1_000, durations);
    expect(running.deadline).toBe(601_000);
    expect(getRemainingMs(running, 61_000)).toBe(540_000);

    const paused = pauseTimerRuntime(running, 61_000);
    expect(paused).toMatchObject({ status: "paused", remainingMs: 540_000, deadline: null });
    expect(startTimerRuntime(paused, 100_000, durations).deadline).toBe(640_000);
  });

  it("moves through short and long breaks using completed focus sessions", () => {
    const firstFocus = startTimerRuntime(createTimerRuntime("pomodoro", durations), 0, durations);
    const shortBreak = reconcileTimerRuntime(firstFocus, 25 * 60_000, durations);
    expect(shortBreak).toMatchObject({ phase: "shortBreak", status: "idle", completedFocusSessions: 1 });

    const secondFocus = startTimerRuntime(
      { ...shortBreak, phase: "focus", remainingMs: 25 * 60_000 },
      2_000_000,
      durations,
    );
    const longBreak = reconcileTimerRuntime(secondFocus, 3_500_000, durations);
    expect(longBreak).toMatchObject({ phase: "longBreak", status: "idle", completedFocusSessions: 2 });
  });

  it("catches up chained automatic phases from their original deadlines", () => {
    const automatic = {
      ...durations,
      focusMinutes: 1,
      shortBreakMinutes: 1,
      autoStartBreaks: true,
      autoStartFocus: true,
    };
    const running = startTimerRuntime(createTimerRuntime("pomodoro", automatic), 0, automatic);
    const reconciled = reconcileTimerRuntime(running, 125_000, automatic);

    expect(reconciled).toMatchObject({ phase: "focus", status: "running", completedFocusSessions: 1 });
    expect(reconciled.deadline).toBe(180_000);
    expect(reconciled.history).toHaveLength(2);
  });

  it("keeps only the latest 20 completions", () => {
    let state = startTimerRuntime(createTimerRuntime("timer", { ...durations, timerMinutes: 1 }), 0, durations);
    for (let index = 1; index <= 25; index += 1) {
      state = reconcileTimerRuntime(state, index * 60_000, { ...durations, timerMinutes: 1 });
      state = startTimerRuntime(state, index * 60_000, { ...durations, timerMinutes: 1 });
    }
    expect(state.history).toHaveLength(20);
  });

  it("resets only live state when the permanent mode changes", () => {
    const initial = createTimerRuntime("timer", durations);
    const withHistory = {
      ...initial,
      history: [{ id: "timer:1", phase: "timer" as const, completedAt: 1, durationMs: 1 }],
    };
    const synchronized = synchronizeTimerRuntime(withHistory, "pomodoro", durations);
    expect(synchronized).toMatchObject({ mode: "pomodoro", phase: "focus", status: "idle" });
    expect(synchronized.history).toEqual(withHistory.history);
  });

  it("rejects inconsistent stored deadlines and modes", () => {
    const valid = createTimerRuntime("pomodoro", durations);
    expect(isTimerRuntimeState(valid)).toBe(true);
    expect(isTimerRuntimeState({ ...valid, status: "running", deadline: null })).toBe(false);
    expect(isTimerRuntimeState({ ...valid, phase: "timer" })).toBe(false);
  });
});
