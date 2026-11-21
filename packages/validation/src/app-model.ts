export const normalizeAppWidgetOptions = (options: Record<string, unknown>): Record<string, unknown> => {
  if (options.openIn !== undefined) return options;
  if (options.openInNewTab === undefined && options.openInNewWindow === undefined) return options;

  const { openInNewTab, openInNewWindow, ...remainingOptions } = options;
  let openIn = "newTab";
  if (openInNewWindow === true) openIn = "newWindow";
  else if (openInNewTab === false) openIn = "currentTab";

  return { ...remainingOptions, openIn };
};
