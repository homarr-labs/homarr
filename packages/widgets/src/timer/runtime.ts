export type TimerMode = "timer" | "pomodoro";
export type TimerPhase = "timer" | "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export interface TimerDurations {
  timerMinutes: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface TimerHistoryEntry {
  id: string;
  phase: TimerPhase;
  completedAt: number;
  durationMs: number;
}

export interface TimerAlertPreferences {
  notifications: boolean;
  sound: boolean;
}

export interface TimerRuntimeState {
  mode: TimerMode;
  phase: TimerPhase;
  status: TimerStatus;
  remainingMs: number;
  totalDurationMs: number;
  deadline: number | null;
  completedFocusSessions: number;
  history: TimerHistoryEntry[];
  alerts: TimerAlertPreferences;
  awaitingManualStart: boolean;
}

const maximumHistoryEntries = 20;
const maximumReconciledPhases = 100;
const maximumDurationMs = 24 * 60 * 60_000;

export const createTimerRuntime = (mode: TimerMode, durations: TimerDurations): TimerRuntimeState => {
  const phase = getInitialPhase(mode);
  return {
    mode,
    phase,
    status: "idle",
    remainingMs: getPhaseDurationMs(phase, durations),
    totalDurationMs: getPhaseDurationMs(phase, durations),
    deadline: null,
    completedFocusSessions: 0,
    history: [],
    alerts: { notifications: false, sound: true },
    awaitingManualStart: false,
  };
};

export const isTimerRuntimeState = (value: unknown): value is TimerRuntimeState => {
  if (!isRecord(value)) return false;
  if (value.mode !== "timer" && value.mode !== "pomodoro") return false;
  if (!isTimerPhase(value.phase) || !isTimerStatus(value.status)) return false;
  if (value.mode === "timer" && value.phase !== "timer") return false;
  if (value.mode === "pomodoro" && value.phase === "timer") return false;
  if (!isFiniteNumber(value.remainingMs) || value.remainingMs < 0) return false;
  if (!isFiniteNumber(value.totalDurationMs) || value.totalDurationMs <= 0) return false;
  if (value.totalDurationMs > maximumDurationMs || value.remainingMs > value.totalDurationMs) return false;
  if (value.deadline !== null && !isFiniteNumber(value.deadline)) return false;
  if (value.status === "running" && value.deadline === null) return false;
  if (value.status !== "running" && value.deadline !== null) return false;
  if (!isFiniteNumber(value.completedFocusSessions) || !Number.isInteger(value.completedFocusSessions)) return false;
  if (value.completedFocusSessions < 0 || value.completedFocusSessions > 12) return false;
  if (!Array.isArray(value.history) || value.history.length > maximumHistoryEntries) return false;
  if (!value.history.every(isTimerHistoryEntry)) return false;
  if (!isRecord(value.alerts)) return false;
  if (typeof value.alerts.notifications !== "boolean" || typeof value.alerts.sound !== "boolean") return false;
  return typeof value.awaitingManualStart === "boolean";
};

export const migrateTimerRuntimeState = (value: unknown, storedVersion: number): TimerRuntimeState | undefined => {
  if ((storedVersion !== 1 && storedVersion !== 2) || !isRecord(value) || !isRecord(value.alerts)) return undefined;
  let awaitingManualStart = false;
  if (storedVersion === 2 && typeof value.awaitingManualStart === "boolean") {
    awaitingManualStart = value.awaitingManualStart;
  }
  const migrated = {
    ...value,
    alerts: { ...value.alerts, sound: true },
    awaitingManualStart,
  };
  if (!isTimerRuntimeState(migrated)) return undefined;
  return migrated;
};

export const getPhaseDurationMs = (phase: TimerPhase, durations: TimerDurations): number => {
  if (phase === "timer") return durations.timerMinutes * 60_000;
  if (phase === "focus") return durations.focusMinutes * 60_000;
  if (phase === "shortBreak") return durations.shortBreakMinutes * 60_000;
  return durations.longBreakMinutes * 60_000;
};

export const getRemainingMs = (state: TimerRuntimeState, now: number): number => {
  if (state.status !== "running" || state.deadline === null) return state.remainingMs;
  return Math.max(0, state.deadline - now);
};

export const startTimerRuntime = (
  state: TimerRuntimeState,
  now: number,
  durations: TimerDurations,
): TimerRuntimeState => {
  if (state.status === "running") return state;
  const remainingMs = state.remainingMs > 0 ? state.remainingMs : getPhaseDurationMs(state.phase, durations);
  const totalDurationMs = state.remainingMs > 0 ? state.totalDurationMs : remainingMs;
  return {
    ...state,
    status: "running",
    remainingMs,
    totalDurationMs,
    deadline: now + remainingMs,
    awaitingManualStart: false,
  };
};

export const pauseTimerRuntime = (state: TimerRuntimeState, now: number): TimerRuntimeState => {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", remainingMs: getRemainingMs(state, now), deadline: null };
};

export const resetTimerRuntime = (state: TimerRuntimeState, durations: TimerDurations): TimerRuntimeState => {
  const phase = getInitialPhase(state.mode);
  return {
    ...state,
    phase,
    status: "idle",
    remainingMs: getPhaseDurationMs(phase, durations),
    totalDurationMs: getPhaseDurationMs(phase, durations),
    deadline: null,
    completedFocusSessions: 0,
    awaitingManualStart: false,
  };
};

export const synchronizeTimerRuntime = (
  state: TimerRuntimeState,
  mode: TimerMode,
  durations: TimerDurations,
): TimerRuntimeState => {
  if (state.mode !== mode) {
    const initial = createTimerRuntime(mode, durations);
    return { ...initial, history: state.history, alerts: state.alerts };
  }
  if (state.status !== "idle") return state;

  const remainingMs = getPhaseDurationMs(state.phase, durations);
  const completedFocusSessions = Math.min(state.completedFocusSessions, durations.sessionsBeforeLongBreak - 1);
  if (
    remainingMs === state.remainingMs &&
    remainingMs === state.totalDurationMs &&
    completedFocusSessions === state.completedFocusSessions
  ) {
    return state;
  }
  return { ...state, remainingMs, totalDurationMs: remainingMs, completedFocusSessions };
};

export const reconcileTimerRuntime = (
  state: TimerRuntimeState,
  now: number,
  durations: TimerDurations,
): TimerRuntimeState => {
  let next = state;
  let reconciled = 0;

  while (next.status === "running" && next.deadline !== null && next.deadline <= now) {
    next = completeTimerPhase(next, next.deadline, durations);
    reconciled += 1;
    if (reconciled >= maximumReconciledPhases) break;
  }

  if (reconciled < maximumReconciledPhases) return next;
  if (next.status !== "running") return next;
  const remainingMs = getPhaseDurationMs(next.phase, durations);
  return { ...next, remainingMs, totalDurationMs: remainingMs, deadline: now + remainingMs };
};

export const setTimerAlertPreference = (
  state: TimerRuntimeState,
  preference: keyof TimerAlertPreferences,
  enabled: boolean,
): TimerRuntimeState => ({
  ...state,
  alerts: { ...state.alerts, [preference]: enabled },
});

const completeTimerPhase = (
  state: TimerRuntimeState,
  completedAt: number,
  durations: TimerDurations,
): TimerRuntimeState => {
  const durationMs = state.totalDurationMs;
  const history = [
    ...state.history,
    { id: `${state.phase}:${completedAt}`, phase: state.phase, completedAt, durationMs },
  ].slice(-maximumHistoryEntries);

  if (state.mode === "timer") {
    return {
      ...state,
      status: "idle",
      remainingMs: getPhaseDurationMs(state.phase, durations),
      totalDurationMs: getPhaseDurationMs(state.phase, durations),
      deadline: null,
      history,
      awaitingManualStart: true,
    };
  }

  if (state.phase === "focus") {
    const completedFocusSessions = state.completedFocusSessions + 1;
    const isLongBreak = completedFocusSessions >= durations.sessionsBeforeLongBreak;
    const phase: TimerPhase = isLongBreak ? "longBreak" : "shortBreak";
    return startNextPhase(
      { ...state, phase, completedFocusSessions, history },
      completedAt,
      durations,
      durations.autoStartBreaks,
    );
  }

  const completedFocusSessions = state.phase === "longBreak" ? 0 : state.completedFocusSessions;
  return startNextPhase(
    { ...state, phase: "focus", completedFocusSessions, history },
    completedAt,
    durations,
    durations.autoStartFocus,
  );
};

const startNextPhase = (
  state: TimerRuntimeState,
  completedAt: number,
  durations: TimerDurations,
  autoStart: boolean,
): TimerRuntimeState => {
  const remainingMs = getPhaseDurationMs(state.phase, durations);
  if (!autoStart) {
    return {
      ...state,
      status: "idle",
      remainingMs,
      totalDurationMs: remainingMs,
      deadline: null,
      awaitingManualStart: true,
    };
  }
  return {
    ...state,
    status: "running",
    remainingMs,
    totalDurationMs: remainingMs,
    deadline: completedAt + remainingMs,
    awaitingManualStart: false,
  };
};

const getInitialPhase = (mode: TimerMode): TimerPhase => {
  if (mode === "timer") return "timer";
  return "focus";
};

const isTimerPhase = (value: unknown): value is TimerPhase =>
  value === "timer" || value === "focus" || value === "shortBreak" || value === "longBreak";

const isTimerStatus = (value: unknown): value is TimerStatus =>
  value === "idle" || value === "running" || value === "paused";

const isTimerHistoryEntry = (value: unknown): value is TimerHistoryEntry => {
  if (!isRecord(value) || typeof value.id !== "string" || !isTimerPhase(value.phase)) return false;
  return isFiniteNumber(value.completedAt) && isFiniteNumber(value.durationMs) && value.durationMs > 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
