import { Anchor, Group, Text } from "@mantine/core";
import { IconExternalLink, IconKey } from "@tabler/icons-react";

export interface IntegrationApiKeySettingsLinkProps {
  safeHref: string | null;
  label: string;
}

export function IntegrationApiKeySettingsLink({ safeHref, label }: IntegrationApiKeySettingsLinkProps) {
  if (!safeHref) return null;
  return (
    <Anchor href={safeHref} target="_blank" rel="noopener noreferrer" size="sm">
      <Group gap={4}>
        <IconKey size={14} stroke={1.5} />
        <Text size="sm">{label}</Text>
        <IconExternalLink size={14} stroke={1.5} />
      </Group>
    </Anchor>
  );
}
