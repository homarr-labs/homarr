import type { WidgetDefinition } from "@site/src/types";
import { IconClockPlay } from "@tabler/icons-react";

export const timerWidget: WidgetDefinition = {
  icon: IconClockPlay,
  name: "Timer / Pomodoro",
  description: "Runs a simple timer or a configurable Pomodoro sequence.",
  path: "../../widgets/timer",
  configuration: {
    items: [
      {
        name: "Mode",
        description: "Run one reusable timer or a repeating focus and break sequence",
        values: { type: "select", options: ["Timer", "Pomodoro"] },
        defaultValue: "Pomodoro",
      },
      {
        name: "Timer minutes",
        description: "Duration of the reusable timer",
        values: "1-1440 minutes",
        defaultValue: "10",
      },
      {
        name: "Focus minutes",
        description: "Duration of each Pomodoro focus session",
        values: "1-180 minutes",
        defaultValue: "25",
      },
      {
        name: "Short break minutes",
        description: "Duration of breaks between most focus sessions",
        values: "1-60 minutes",
        defaultValue: "5",
      },
      {
        name: "Long break minutes",
        description: "Duration of the break at the end of a Pomodoro cycle",
        values: "1-180 minutes",
        defaultValue: "15",
      },
      {
        name: "Focus sessions before a long break",
        description: "Number of completed focus sessions in one Pomodoro cycle",
        values: "1-12 sessions",
        defaultValue: "4",
      },
      {
        name: "Automatically start breaks",
        description: "Start the next short or long break when a focus session completes",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Automatically start focus sessions",
        description: "Start the next focus session when a break completes",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
