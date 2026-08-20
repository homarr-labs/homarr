"use client";

import { Fragment } from "react";
import { Card, CardSection, Divider, Group, Stack, Text, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface DangerZoneRootProps {
  children: React.ReactNode[] | React.ReactNode;
}

export const DangerZoneRoot = ({ children }: DangerZoneRootProps) => {
  const t = useI18n("common");

  return (
    <Stack gap="sm">
      <Title c="red.8" order={2}>
        {t("dangerZone")}
      </Title>
      <Card style={{ borderColor: "var(--mantine-color-red-8)", borderWidth: 3 }}>
        <Stack gap="sm">
          {Array.isArray(children)
            ? children.map((child, index) => (
                <Fragment key={index}>
                  {child}
                  {index + 1 !== children.length && (
                    <CardSection>
                      <Divider />
                    </CardSection>
                  )}
                </Fragment>
              ))
            : children}
        </Stack>
      </Card>
    </Stack>
  );
};

interface DangerZoneItemProps {
  label: string;
  description: string;
  action: React.ReactNode;
}

export const DangerZoneItem = ({ label, description, action }: DangerZoneItemProps) => {
  return (
    <Group justify="space-between" px="md" w={"100%"}>
      <Stack gap={0}>
        <Text fw="bold" size="sm">
          {label}
        </Text>
        <Text size="sm">{description}</Text>
      </Stack>
      <Group justify="end" w={{ xs: "100%", sm: "100%", md: "auto" }}>
        {action}
      </Group>
    </Group>
  );
};
