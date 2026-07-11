export const createNextcloudCalendarServerUrl = (integrationUrl: string) => {
  const calendarServerUrl = new URL(integrationUrl);
  const integrationPath = calendarServerUrl.pathname.replace(/\/+$/, "");

  calendarServerUrl.pathname = `${integrationPath}/remote.php/dav/`;
  calendarServerUrl.search = "";
  calendarServerUrl.hash = "";

  return calendarServerUrl.toString();
};
