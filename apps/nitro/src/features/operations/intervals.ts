export const operationsCronIntervals = [
  { value: "*/1 * * * * *", unit: "seconds", interval: 1 },
  { value: "*/5 * * * * *", unit: "seconds", interval: 5 },
  { value: "*/10 * * * * *", unit: "seconds", interval: 10 },
  { value: "*/20 * * * * *", unit: "seconds", interval: 20 },
  { value: "*/30 * * * * *", unit: "seconds", interval: 30 },
  { value: "* * * * *", unit: "minutes", interval: 1 },
  { value: "*/5 * * * *", unit: "minutes", interval: 5 },
  { value: "*/10 * * * *", unit: "minutes", interval: 10 },
  { value: "*/15 * * * *", unit: "minutes", interval: 15 },
  { value: "0 * * * *", unit: "hours", interval: 1 },
  { value: "0 */2 * * *", unit: "hours", interval: 2 },
  { value: "0 */4 * * *", unit: "hours", interval: 4 },
  { value: "0 0 * * */1", unit: "midnight" },
  { value: "0 0 * * 1", unit: "weeklyMonday" },
] as const;

export function isOperationsCronInterval(value: string) {
  return operationsCronIntervals.some((entry) => entry.value === value);
}
