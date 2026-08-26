import { useState } from "react";
import { Anchor, Button, Stack, Text } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import type { stringOrTranslation } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { Link, zoomCompensatedSize } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";

export interface BaseWidgetErrorProps {
  icon: TablerIcon;
  message: stringOrTranslation;
  showLogsLink?: boolean;
  onRetry: () => void;
}

export const BaseWidgetError = (props: BaseWidgetErrorProps) => {
  const t = useI18n();
  const tCommon = useI18n("common");
  const { data: session } = useSession();
  const [errorTimestamp] = useState(Date.now);

  return (
    <Stack h="100%" align="center" justify="center" gap="md" data-homarr-widget-error>
      <props.icon style={zoomCompensatedSize(40)} />
      <Stack gap={0}>
        <Text ta="center">{translateIfNecessary(t, props.message)}</Text>
        {props.showLogsLink && session?.user.permissions.includes("other-view-logs") && (
          <Anchor
            component={Link}
            href={`/manage/tools/logs?focus=${errorTimestamp}`}
            target="_blank"
            ta="center"
            size="sm"
          >
            {tCommon("action.checkLogs")}
          </Anchor>
        )}
      </Stack>

      <Button onClick={props.onRetry} size="sm" variant="light">
        {tCommon("action.tryAgain")}
      </Button>
    </Stack>
  );
};
