import { useEffect, useState } from "react";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import timezones from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { Flex, Stack, Text } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezones);

export default function ClockWidget({
  options: _options,
  integrations: _integrations,
  serverData: _serverData,
}: WidgetComponentProps<"clock">) {
  const secondsFormat = _options.showSeconds ? ":ss" : "";
  const timeFormat = _options.is24HourFormat
    ? `HH:mm${secondsFormat}`
    : `h:mm${secondsFormat} A`;
  const dateFormat = _options.dateFormat;
  const timezone = _options.useCustomTimezone
    ? _options.timezone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Flex
      classNames={{ root: "clock-wrapper" }}
      align="center"
      justify="center"
      h="100%"
    >
      <Stack classNames={{ root: "clock-text-stack" }} align="center" gap="xs">
        {_options.customTitle && (
          <Text classNames={{ root: "clock-customTitle-text" }}>
            {_options.customTitle}
          </Text>
        )}
        <Text
          classNames={{ root: "clock-time-text" }}
          fw={700}
          size="2.125rem"
          lh="1"
        >
          {dayjs(time).tz(timezone).format(timeFormat)}
        </Text>
        {_options.showDate && (
          <Text classNames={{ root: "clock-date-text" }} lineClamp={1}>
            {dayjs(time).tz(timezone).format(dateFormat)}
          </Text>
        )}
      </Stack>
    </Flex>
  );
}
