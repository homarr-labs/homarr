import { Fragment } from "react";
import type { ComponentPropsWithRef } from "react";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";

import type { AppItemViewProps } from "./contracts";

export const AppItemView = ({
  id,
  name,
  iconUrl,
  description,
  href,
  safeHref,
  editLabel,
  editLink: EditLink,
  deleteAction,
  renderItem,
}: AppItemViewProps) => {
  const descriptionLines = description?.split("\n");

  return renderItem({
    leading: <Avatar size={36} src={iconUrl} radius="sm" styles={{ image: { objectFit: "contain" } }} alt="" />,
    title: (
      <Text component="span" fw={600} lineClamp={1}>
        {name}
      </Text>
    ),
    description: descriptionLines ? (
      <Text size="sm" c="dimmed" lineClamp={2}>
        {descriptionLines.map((line, index) => (
          <Fragment key={index}>
            {line}
            {index < descriptionLines.length - 1 && <br />}
          </Fragment>
        ))}
      </Text>
    ) : undefined,
    metadata: safeHref ? (
      <Anchor
        href={safeHref}
        target="_blank"
        rel="noreferrer"
        lineClamp={1}
        size="sm"
        style={{ wordBreak: "break-all" }}
      >
        {href}
      </Anchor>
    ) : undefined,
    actions: (
      <ActionIconGroup>
        <ActionIcon
          component="a"
          renderRoot={(props: ComponentPropsWithRef<"a">) => <EditLink {...props} />}
          href={`/manage/apps/edit/${id}`}
          variant="subtle"
          color="gray"
          size={44}
          aria-label={editLabel}
        >
          <IconPencil size={18} stroke={1.5} />
        </ActionIcon>
        {deleteAction}
      </ActionIconGroup>
    ),
  });
};
