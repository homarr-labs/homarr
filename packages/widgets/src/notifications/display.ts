interface NotificationDisplayInput {
  displayMode?: "compact" | "advanced";
  hideLogos: boolean;
  isRoomy: boolean;
  bodyLineClamp: number;
}

export const getNotificationDisplay = ({
  displayMode,
  hideLogos,
  isRoomy,
  bodyLineClamp,
}: NotificationDisplayInput) => {
  const isAdvanced = displayMode === "advanced";
  return {
    showLogos: isAdvanced || !hideLogos,
    showSource: isAdvanced || isRoomy,
    bodyLineClamp: isAdvanced ? undefined : bodyLineClamp,
  };
};
