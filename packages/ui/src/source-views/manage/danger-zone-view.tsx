"use client";

import { Fragment } from "react";
import { Card, CardSection, Divider, Group, Stack, Text, Title } from "@mantine/core";

import type { DangerZoneItemProps, DangerZoneRootViewProps } from "./contracts";

export const DangerZoneRootView = ({ heading, children }: DangerZoneRootViewProps) => {
  return (
    <Stack gap="sm">
      <Title c="red.8" order={2}>
        {heading}
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
