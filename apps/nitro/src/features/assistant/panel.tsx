import { Drawer } from "@mantine/core";
import { useCallback, useState } from "react";

import { AssistantChat } from "./chat";
import type { AssistantChatProps } from "./chat";
import { useAssistantFeature } from "./feature";

export function AssistantPanel({
  opened,
  onClose,
  ...chat
}: AssistantChatProps & {
  readonly opened: boolean;
  readonly onClose: () => void;
}) {
  const { t } = useAssistantFeature();
  const [busy, setBusy] = useState(false);
  const reportBusy = useCallback(
    (value: boolean) => {
      setBusy(value);
      chat.onBusyChange?.(value);
    },
    [chat.onBusyChange],
  );
  return (
    <Drawer
      opened={opened}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t("assistant.title")}
      position="right"
      size="xl"
      closeOnEscape={!busy}
      closeOnClickOutside={!busy}
      closeButtonProps={{ disabled: busy, "aria-label": t("assistant.close") }}
      keepMounted
    >
      <AssistantChat {...chat} onBusyChange={reportBusy} />
    </Drawer>
  );
}
