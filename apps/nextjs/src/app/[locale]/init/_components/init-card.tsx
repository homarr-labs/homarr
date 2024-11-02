import type { PropsWithChildren } from "react";
import Link from "next/link";
import type { CardProps } from "@mantine/core";
import { Button, Card, GridCol, Stack, Text } from "@mantine/core";

import classes from "../init.module.css";

export const InitGridColCard = ({ children, p }: PropsWithChildren<Pick<CardProps, "p">>) => {
  return (
    <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
      <Card className={classes.card} w={64 * 6} maw="90vw" p={p}>
        {children}
      </Card>
    </GridCol>
  );
};

interface InitCardContentProps {
  title: string;
  description: string;
  note?: string;
  buttonProps: {
    label: string;
    href: string;
  };
}

const InitCardContent = ({ title, description, note, buttonProps }: InitCardContentProps) => {
  return (
    <Stack justify="space-between" h="100%">
      <Stack>
        <Text fw={500}>{title}</Text>
        <Text>{description}</Text>
        {Boolean(note) && (
          <Text size="xs" c="gray.5">
            {note}
          </Text>
        )}
      </Stack>
      <Button fullWidth component={Link} href={buttonProps.href}>
        {buttonProps.label}
      </Button>
    </Stack>
  );
};

InitGridColCard.Content = InitCardContent;
