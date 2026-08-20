import { IconClockPlay } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("timer", {
  icon: IconClockPlay,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        mode: factory.select({
          defaultValue: "pomodoro",
          options: [
            { value: "timer", label: (t) => t("widget.timer.option.mode.options.timer") },
            { value: "pomodoro", label: (t) => t("widget.timer.option.mode.options.pomodoro") },
          ],
        }),
        timerMinutes: factory.number({
          defaultValue: 10,
          validate: z.number().int().min(1).max(1440),
        }),
        focusMinutes: factory.number({
          defaultValue: 25,
          validate: z.number().int().min(1).max(180),
        }),
        shortBreakMinutes: factory.number({
          defaultValue: 5,
          validate: z.number().int().min(1).max(60),
        }),
        longBreakMinutes: factory.number({
          defaultValue: 15,
          validate: z.number().int().min(1).max(180),
        }),
        sessionsBeforeLongBreak: factory.number({
          defaultValue: 4,
          validate: z.number().int().min(1).max(12),
        }),
        autoStartBreaks: factory.switch({ defaultValue: false }),
        autoStartFocus: factory.switch({ defaultValue: false }),
      }),
      {
        timerMinutes: { shouldHide: ({ mode }) => mode !== "timer" },
        focusMinutes: { shouldHide: ({ mode }) => mode !== "pomodoro" },
        shortBreakMinutes: { shouldHide: ({ mode }) => mode !== "pomodoro" },
        longBreakMinutes: { shouldHide: ({ mode }) => mode !== "pomodoro" },
        sessionsBeforeLongBreak: { shouldHide: ({ mode }) => mode !== "pomodoro" },
        autoStartBreaks: { shouldHide: ({ mode }) => mode !== "pomodoro" },
        autoStartFocus: { shouldHide: ({ mode }) => mode !== "pomodoro" },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
