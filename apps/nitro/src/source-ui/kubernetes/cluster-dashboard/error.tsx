import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconCubeOff } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export function KubernetesErrorPage({ onCheckLogs }: { onCheckLogs?: () => void }) {
  const tKubernetes = useI18n("kubernetes");
  const tCommon = useI18n("common");
  return (
    <Center>
      <Stack align="center">
        <IconCubeOff size={48} stroke={1.5} />
        <Stack align="center" gap="xs">
          <Text size="lg" fw={500}>
            {tKubernetes("error.internalServerError")}
          </Text>
          <Anchor
            component="button"
            type="button"
            size="sm"
            disabled={!onCheckLogs}
            c={onCheckLogs ? undefined : "dimmed"}
            underline={onCheckLogs ? "hover" : "never"}
            onClick={onCheckLogs}
          >
            {tCommon("action.checkLogs")}
          </Anchor>
          {!onCheckLogs && (
            <Text size="xs" c="dimmed">
              Log navigation unavailable
            </Text>
          )}
        </Stack>
      </Stack>
    </Center>
  );
}
