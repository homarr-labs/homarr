export const automaticTimeFormat = "automatic";

export const resolveClockTimeFormat = (format: string, legacyIs24HourFormat: boolean) => {
  if (format && format !== automaticTimeFormat) return format;
  if (legacyIs24HourFormat) return "HH:mm";
  return "hh:mm A";
};

export const clockTimeFormatUses12Hours = (format: string, legacyIs24HourFormat: boolean) => {
  if (!format || format === automaticTimeFormat) return !legacyIs24HourFormat;
  const formatWithoutLiterals = format.replace(/\[[^\]]*\]/g, "");
  return /h{1,2}/.test(formatWithoutLiterals);
};

export const clockTimeFormatShowsSeconds = (format: string) => {
  if (!format || format === automaticTimeFormat) return false;
  const formatWithoutLiterals = format.replace(/\[[^\]]*\]/g, "");
  return /s{1,2}/.test(formatWithoutLiterals);
};
