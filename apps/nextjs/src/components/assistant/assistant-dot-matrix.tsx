import type { ComponentProps, CSSProperties } from "react";

import classes from "./assistant-dot-matrix.module.css";

const gridSize = 5;
const center = (gridSize - 1) / 2;
const dotIndexes = Array.from({ length: gridSize * gridSize }, (_, index) => index);

const hash = (value: number, salt: number, range: number) => {
  let mixed = (Math.imul(value, 374761393) + Math.imul(salt, 668265263)) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 13), 1274126177) >>> 0;
  return ((mixed ^ (mixed >>> 16)) % range) / 1000;
};

const glyph = (dots: [number, number][]) => new Set(dots.map(([row, column]) => row * gridSize + column));

const check = glyph([
  [1, 4],
  [2, 3],
  [3, 0],
  [3, 2],
  [4, 1],
]);
const cross = glyph([
  [0, 0],
  [0, 4],
  [1, 1],
  [1, 3],
  [2, 2],
  [3, 1],
  [3, 3],
  [4, 0],
  [4, 4],
]);
const bang = glyph([
  [0, 2],
  [1, 2],
  [2, 2],
  [4, 2],
]);
const info = glyph([
  [0, 2],
  [2, 2],
  [3, 2],
  [4, 2],
]);
const pause = glyph([
  [1, 1],
  [2, 1],
  [3, 1],
  [1, 3],
  [2, 3],
  [3, 3],
]);
const stop = glyph([
  [1, 1],
  [1, 2],
  [1, 3],
  [2, 1],
  [2, 2],
  [2, 3],
  [3, 1],
  [3, 2],
  [3, 3],
]);
const record = glyph([
  [1, 2],
  [2, 1],
  [2, 2],
  [2, 3],
  [3, 2],
]);
const ellipsis = glyph([
  [2, 0],
  [2, 2],
  [2, 4],
]);

interface Blink {
  duration: number;
  delay: number;
  lo: number;
}

interface StateConfig {
  glyph?: Set<number>;
  base?: number;
  dim?: number;
  blink?: (index: number, row: number, column: number) => Blink;
}

const states = {
  idle: { base: 0.3 },
  loading: {
    blink: (index) => ({
      duration: 0.9 + hash(index, 2, 700),
      delay: -hash(index, 1, 1200),
      lo: 0.15,
    }),
  },
  thinking: {
    blink: (_index, row, column) => ({
      duration: 1.2,
      delay: -(row + column) * 0.09,
      lo: 0.2,
    }),
  },
  streaming: {
    blink: (_index, row, column) => ({
      duration: 0.9,
      delay: -(row * 0.12 + hash(column, 3, 900)),
      lo: 0.15,
    }),
  },
  searching: {
    blink: (_index, _row, column) => ({ duration: 1.1, delay: -column * 0.12, lo: 0.2 }),
  },
  syncing: {
    blink: (_index, row, column) => {
      const turn = (Math.atan2(row - center, column - center) + Math.PI) / (2 * Math.PI);
      return { duration: 1.3, delay: -turn * 1.3, lo: 0.2 };
    },
  },
  connecting: {
    blink: (_index, row, column) => ({
      duration: 1.4,
      delay: -Math.max(Math.abs(row - center), Math.abs(column - center)) * 0.18,
      lo: 0.15,
    }),
  },
  waiting: {
    glyph: ellipsis,
    blink: (_index, _row, column) => ({
      duration: 1.2,
      delay: -column * 0.09,
      lo: 0.2,
    }),
  },
  uploading: {
    blink: (_index, row) => ({
      duration: 1,
      delay: -(gridSize - 1 - row) * 0.12,
      lo: 0.2,
    }),
  },
  downloading: {
    blink: (_index, row) => ({ duration: 1, delay: -row * 0.12, lo: 0.2 }),
  },
  listening: {
    blink: (_index, _row, column) => ({
      duration: 0.7 + hash(column, 4, 500),
      delay: -hash(column, 5, 900),
      lo: 0.25,
    }),
  },
  speaking: {
    blink: (_index, _row, column) => ({
      duration: 0.4 + hash(column, 6, 350),
      delay: -hash(column, 7, 700),
      lo: 0.2,
    }),
  },
  recording: {
    glyph: record,
    dim: 0.12,
    blink: () => ({ duration: 1.4, delay: 0, lo: 0.3 }),
  },
  success: { glyph: check },
  error: {
    glyph: cross,
    blink: () => ({ duration: 1.1, delay: 0, lo: 0.4 }),
  },
  warning: {
    glyph: bang,
    blink: () => ({ duration: 1.6, delay: 0, lo: 0.45 }),
  },
  info: { glyph: info },
  paused: { glyph: pause },
  stopped: { glyph: stop },
  offline: { base: 0.15 },
} satisfies Record<string, StateConfig>;

export type AssistantDotMatrixState = keyof typeof states;

export const assistantDotMatrixStates = Object.keys(states) as readonly AssistantDotMatrixState[];

interface AssistantDotMatrixProps extends Omit<ComponentProps<"output">, "children"> {
  state?: AssistantDotMatrixState;
  label?: string;
}

export const AssistantDotMatrix = ({ className, state = "loading", label, ...props }: AssistantDotMatrixProps) => {
  const config: StateConfig = states[state];

  return (
    <output
      data-slot="assistant-dot-matrix"
      data-state={state}
      className={[classes.root, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className={classes.visuallyHidden}>{label ?? state}</span>
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={classes.grid}>
        {dotIndexes.map((index) => {
          const row = Math.floor(index / gridSize);
          const column = index % gridSize;
          const on = !config.glyph || config.glyph.has(index);
          const hi = on ? (config.base ?? 1) : (config.dim ?? 0.15);
          const blink = on ? config.blink?.(index, row, column) : undefined;

          return (
            <circle
              key={index}
              data-slot="assistant-dot-matrix-dot"
              cx={2 + column * 4}
              cy={2 + row * 4}
              r={1.3}
              className={classes.dot}
              style={
                {
                  opacity: hi,
                  animationDuration: `${blink?.duration ?? 1}s`,
                  animationDelay: `${blink?.delay ?? 0}s`,
                  "--assistant-dot-matrix-hi": hi,
                  "--assistant-dot-matrix-lo": blink?.lo ?? hi,
                } as CSSProperties
              }
            />
          );
        })}
      </svg>
    </output>
  );
};
