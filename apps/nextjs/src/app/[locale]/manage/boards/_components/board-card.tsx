"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CardSection,
  Collapse,
  Group,
  Menu,
  MenuTarget,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconDeviceMobile, IconDotsVertical, IconHomeFilled, IconLock, IconWorld } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { Link, UserAvatar } from "@homarr/ui";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";
import { BoardCardMenuDropdown } from "./board-card-menu-dropdown";
import { DuplicateBoardForm } from "./duplicate-board-form";

interface BoardCardProps {
  board: RouterOutputs["board"]["getManageOverview"][number];
  isMenuVisible: boolean;
  labels: {
    visibility: string;
    preview: string;
    unknownCreator: string;
    home: string;
    homeTooltip: string;
    mobileHome: string;
    mobileHomeTooltip: string;
    open: string;
    settings: string;
  };
}

export const BoardCard = ({ board, isMenuVisible, labels }: BoardCardProps) => {
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateFormKey, setDuplicateFormKey] = useState(0);
  const VisibilityIcon = board.isPublic ? IconWorld : IconLock;

  return (
    <>
      <Card padding={0} withBorder>
        <CardSection withBorder>
          <BoardLayoutThumbnail preview={board.preview} label={labels.preview} />
        </CardSection>
        <CardSection p="sm" withBorder>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 12rem" }}>
              <Tooltip label={labels.visibility}>
                <VisibilityIcon size={20} stroke={1.5} />
              </Tooltip>
              <Text fw={700} truncate>
                {board.name}
              </Text>
            </Group>

            <Group gap="xs" justify="flex-end" wrap="wrap" style={{ marginInlineStart: "auto" }}>
              {board.isHome && (
                <Tooltip label={labels.homeTooltip}>
                  <Badge tt="none" color="yellow" variant="light" leftSection={<IconHomeFilled size=".7rem" />}>
                    {labels.home}
                  </Badge>
                </Tooltip>
              )}

              {board.isMobileHome && (
                <Tooltip label={labels.mobileHomeTooltip}>
                  <Badge tt="none" color="yellow" variant="light" leftSection={<IconDeviceMobile size=".7rem" />}>
                    {labels.mobileHome}
                  </Badge>
                </Tooltip>
              )}

              {board.creator && (
                <Tooltip label={board.creator.name ?? labels.unknownCreator}>
                  <UserAvatar user={board.creator} size="sm" />
                </Tooltip>
              )}
            </Group>
          </Group>
        </CardSection>

        <CardSection>
          <Group gap={0} wrap="nowrap">
            <Button
              style={{ border: "none", borderRadius: 0 }}
              component={Link}
              href={`/boards/${board.name}`}
              variant="default"
              h={44}
              fullWidth
            >
              {labels.open}
            </Button>
            {isMenuVisible && (
              <Menu position="bottom-end">
                <MenuTarget>
                  <ActionIcon
                    style={{ borderTop: "none", borderBottom: "none", borderRight: "none", borderRadius: 0 }}
                    variant="default"
                    size={44}
                    aria-label={labels.settings}
                  >
                    <IconDotsVertical size={16} stroke={1.5} />
                  </ActionIcon>
                </MenuTarget>
                <BoardCardMenuDropdown
                  board={board}
                  onDuplicate={() => {
                    setDuplicateFormKey((value) => value + 1);
                    setIsDuplicateOpen(true);
                  }}
                />
              </Menu>
            )}
          </Group>
        </CardSection>
      </Card>
      <Collapse expanded={isDuplicateOpen}>
        <Card mt="sm" withBorder>
          <DuplicateBoardForm key={duplicateFormKey} board={board} onCancel={() => setIsDuplicateOpen(false)} />
        </Card>
      </Collapse>
    </>
  );
};
