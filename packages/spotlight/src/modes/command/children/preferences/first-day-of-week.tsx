import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import { useUserPreference } from "../../../../preferences/use-user-preference";

import { createChildrenOptions } from "../../../../lib/children";
import { createCheckmarkPreferenceAction, PreferenceDetailHeader } from "./action-row";

dayjs.extend(localeData);

const firstDayOfWeekOptions: DayOfWeek[] = [1, 6, 0];
const weekDays = dayjs.weekdays(false);

export const firstDayOfWeekChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: () => {
    const { value, setValue, isPending } = useUserPreference("firstDayOfWeek");
    const currentValue = value as DayOfWeek;

    return firstDayOfWeekOptions.map((day) =>
      createCheckmarkPreferenceAction({
        key: day.toString(),
        label: weekDays[day] ?? day.toString(),
        isSelected: currentValue === day,
        onSelect: () => setValue(day as never),
        isPending,
      }),
    );
  },
  DetailComponent: () => <PreferenceDetailHeader titleKey="firstDayOfWeek.children.detail.title" />,
});
