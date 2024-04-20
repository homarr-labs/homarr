"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flex, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import timezones from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezones);

export default function ClockWidget({
  options,
}: WidgetComponentProps<"clock">) {
  const secondsFormat = options.showSeconds ? ":ss" : "";
  const timeFormat = options.is24HourFormat
    ? `HH:mm${secondsFormat}`
    : `h:mm${secondsFormat} A`;
  const dateFormat = options.dateFormat;
  const timezone = options.useCustomTimezone
    ? options.timezone
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = useCurrentTime(options);
  return (
    <Flex
      classNames={{ root: "clock-wrapper" }}
      align="center"
      justify="center"
      h="100%"
    >
      <Stack classNames={{ root: "clock-text-stack" }} align="center" gap="xs">
        {options.customTitleToggle && (
          <Text classNames={{ root: "clock-customTitle-text" }}>
            {options.customTitle}
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
        {options.showDate && (
          <Text classNames={{ root: "clock-date-text" }} lineClamp={1}>
            {dayjs(time).tz(timezone).format(dateFormat)}
          </Text>
        )}
      </Stack>
    </Flex>
  );
}

interface UseCurrentTimeProps {
  showSeconds: boolean;
}

const useCurrentTime = ({ showSeconds }: UseCurrentTimeProps) => {
  const [time, setTime] = useState(new Date());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const intervalMultiplier = useMemo(
    () => (showSeconds ? 1 : 60),
    [showSeconds],
  );

  useEffect(() => {
    setTime(new Date());
    timeoutRef.current = setTimeout(
      () => {
        setTime(new Date());

        intervalRef.current = setInterval(() => {
          setTime(new Date());
        }, intervalMultiplier * 1000);
      },
      intervalMultiplier * 1000 -
        (1000 * (showSeconds ? 0 : dayjs().second()) + dayjs().millisecond()),
    );

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, [intervalMultiplier, showSeconds]);

  return time;
};
