"use client";

import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

interface UserAuthenticationInfoProps {
  user: Pick<RouterOutputs["user"]["getById"], "provider" | "groups">;
}

const providerLabels: Record<SupportedAuthProvider, string> = {
  credentials: "Credentials",
  oidc: "OpenID Connect",
  ldap: "LDAP",
};

const getProviderLabel = (provider: string): string => {
  if (provider === "credentials" || provider === "oidc" || provider === "ldap") {
    return providerLabels[provider];
  }
  return provider;
};

export const UserAuthenticationInfo = ({ user }: UserAuthenticationInfoProps) => {
  const tAuthentication = useScopedI18n("management.page.user.setting.general.item.authentication");

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Title order={3}>{tAuthentication("title")}</Title>
        <Group gap="xs">
          <Text fw={500}>{tAuthentication("provider")}:</Text>
          <Badge variant="light">{getProviderLabel(user.provider)}</Badge>
        </Group>
        <Stack gap="xs">
          <Text fw={500}>{tAuthentication("groups")}:</Text>
          {user.groups.length > 0 ? (
            <Group gap="xs">
              {user.groups.map((group) => (
                <Badge key={group.id} variant="outline">
                  {group.name}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text c="dimmed" size="sm">
              {tAuthentication("noGroups")}
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};
