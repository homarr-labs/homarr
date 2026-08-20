export const automaticTimeFormat = "automatic";

export const resolveClockTimeFormat = (format: string, legacyIs24HourFormat: boolean, showSeconds = false) => {
  if (format && format !== automaticTimeFormat) return format;
  if (legacyIs24HourFormat) return showSeconds ? "HH:mm:ss" : "HH:mm";
  return showSeconds ? "hh:mm:ss A" : "hh:mm A";
};

export const clockTimeFormatUses12Hours = (format: string, legacyIs24HourFormat: boolean) => {
  if (!format || format === automaticTimeFormat) return !legacyIs24HourFormat;
  const formatWithoutLiterals = format.replace(/\[[^\]]*\]/g, "");
  return /h{1,2}/.test(formatWithoutLiterals);
};

export const clockTimeFormatShowsSeconds = (format: string, showSeconds = false) => {
  if (!format || format === automaticTimeFormat) return showSeconds;
  const formatWithoutLiterals = format.replace(/\[[^\]]*\]/g, "");
  return /s{1,2}/.test(formatWithoutLiterals);
};
