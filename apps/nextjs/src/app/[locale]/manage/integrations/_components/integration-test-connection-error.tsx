import { useMemo } from "react";
import { Accordion, Card, Stack, Text } from "@mantine/core";
import { IconSubtask } from "@tabler/icons-react";

import type { AnyMappedTestConnectionError, MappedError } from "@homarr/api";
import { getMantineColor } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

interface IntegrationTestConnectionErrorProps {
  error: AnyMappedTestConnectionError;
}

export const IntegrationTestConnectionError = ({ error }: IntegrationTestConnectionErrorProps) => {
  const t = useI18n();
  const causeArray = useMemo(() => toCauseArray(error.cause), [error.cause]);

  return (
    <Card withBorder style={{ borderColor: getMantineColor("red", 8) }}>
      <Stack>
        <Stack gap="sm">
          <Text fw={500} c="red.8">
            {t(`integration.testConnection.error.${error.type}.title`)}
          </Text>

          <Text size="sm">{t(`integration.testConnection.error.${error.type}.description`)}</Text>
        </Stack>

        {error.data ? JSON.stringify(error.data, null, 2) : null}

        {error.cause ? (
          <Accordion variant="contained">
            <Accordion.Item value="cause">
              <Accordion.Control icon={<IconSubtask size={16} stroke={1.5} />}>
                Cause with more details
              </Accordion.Control>
              <Accordion.Panel>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {error.name}: {error.message}
                  {"\n"}
                  {causeArray
                    .map(
                      (cause) =>
                        `caused by ${cause.name}${cause.message ? `: ${cause.message}` : ""} ${cause.metadata.map((item) => `${item.key}=${item.value}`).join(" ")}`,
                    )
                    .join("\n")}
                </pre>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        ) : null}
      </Stack>
    </Card>
  );
};

const toCauseArray = (cause: MappedError | undefined) => {
  const causeArray: MappedError[] = [];
  let currentCause: MappedError | undefined = cause;
  while (currentCause) {
    causeArray.push(currentCause);
    currentCause = currentCause.cause;
  }
  return causeArray.map(({ cause: _innerCause, ...cause }) => cause);
};
