type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type NumberWithoutSpaces = `${Digit}${number | ""}` & `${number | ""}${Digit}`;

type CronChars = `${"*" | "/" | "-" | "," | NumberWithoutSpaces}`;

type ConstrainedCronString<T extends string> = T extends ""
  ? ""
  : T extends `${CronChars}${infer Rest}`
    ? ConstrainedCronString<Rest>
    : number;

export type ValidateCron<TMaybeCron extends string> =
  TMaybeCron extends `${infer inferedSecond} ${infer inferedMinute} ${infer inferedHour} ${infer inferedMonthDay} ${infer inferedMonth} ${infer inferedWeekDay}`
    ? ConstrainedCronString<inferedSecond> extends string
      ? ConstrainedCronString<inferedMinute> extends string
        ? ConstrainedCronString<inferedHour> extends string
          ? ConstrainedCronString<inferedMonthDay> extends string
            ? ConstrainedCronString<inferedMonth> extends string
              ? ConstrainedCronString<inferedWeekDay> extends string
                ? true
                : false
              : false
            : false
          : false
        : false
      : false
    : TMaybeCron extends `${infer inferedMinute} ${infer inferedHour} ${infer inferedMonthDay} ${infer inferedMonth} ${infer inferedWeekDay}`
      ? ConstrainedCronString<inferedMinute> extends string
        ? ConstrainedCronString<inferedHour> extends string
          ? ConstrainedCronString<inferedMonthDay> extends string
            ? ConstrainedCronString<inferedMonth> extends string
              ? ConstrainedCronString<inferedWeekDay> extends string
                ? true
                : false
              : false
            : false
          : false
        : false
      : false;

export const checkCron = <const T extends string>(cron: T) => {
  return cron as ValidateCron<T> extends true ? T : void;
};
