export const createNextcloudCalendarServerUrl = (integrationUrl: string) => {
  const calendarServerUrl = new URL(integrationUrl);
  const integrationPath = calendarServerUrl.pathname.replace(/\/+$/, "");
  const davPath = "/remote.php/dav";

  calendarServerUrl.pathname = integrationPath.endsWith(davPath)
    ? `${integrationPath}/`
    : `${integrationPath}${davPath}/`;
  calendarServerUrl.search = "";
  calendarServerUrl.hash = "";

  return calendarServerUrl.toString();
};
