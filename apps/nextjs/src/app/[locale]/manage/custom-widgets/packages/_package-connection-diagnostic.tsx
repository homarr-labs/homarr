"use client";

import { Accordion, Alert, Badge, Group, Stack, Text } from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

type Diagnostic = RouterOutputs["customWidget"]["package"]["diagnoseConnection"];

export function PackageConnectionDiagnostic({ result }: { result: Diagnostic }) {
  const t = useI18n("customWidget.package.diagnostic");
  let color = "yellow";
  if (["connected", "integration", "fileReadable", "transportReachable"].includes(result.status)) color = "green";
  if (["dnsError", "unavailable", "httpError", "serviceUnavailable"].includes(result.status)) color = "red";
  return (
    <Stack gap="xs">
      <Alert color={color} title={t(`status.${result.status}`)}>
        <Stack gap="xs">
          <Text size="sm">{t(`help.${result.status}`)}</Text>
          {"stage" in result && (
            <Text size="xs">
              {t("phase", { phase: t(`stage.${result.stage as "dns" | "connection" | "tls" | "response"}`) })}
            </Text>
          )}
          {"hostname" in result && (
            <Text size="sm" ff="monospace">
              {result.hostname}
            </Text>
          )}
          {result.addresses.length > 0 && (
            <Group gap="xs">
              {result.addresses.map(({ address }) => (
                <Badge key={address} variant="outline" tt="none">
                  {address}
                </Badge>
              ))}
            </Group>
          )}
          {"httpStatus" in result && typeof result.httpStatus === "number" && typeof result.durationMs === "number" && (
            <Text size="xs">{t("response", { status: result.httpStatus, milliseconds: result.durationMs })}</Text>
          )}
          {"sampleFields" in result && Array.isArray(result.sampleFields) && result.sampleFields.length > 0 && (
            <Text size="xs">{t("fields", { fields: result.sampleFields.join(", ") })}</Text>
          )}
        </Stack>
      </Alert>
      <Accordion>
        <Accordion.Item value="details">
          <Accordion.Control>{t("details")}</Accordion.Control>
          <Accordion.Panel>
            <Text component="pre" size="xs" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(result, null, 2)}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
