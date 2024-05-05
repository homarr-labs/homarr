"use client";

import { useCallback } from "react";
import { Box, Button, FileButton, Menu, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPhotoEdit, IconPhotoX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { UserAvatar } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface UserProfileAvatarForm {
  user: RouterOutputs["user"]["getById"];
}

export const UserProfileAvatarForm = ({ user }: UserProfileAvatarForm) => {
  const { mutate } = clientApi.user.setProfileImage.useMutation();
  const [opened, { toggle }] = useDisclosure(false);
  const { openConfirmModal } = useConfirmModal();

  const handleAvatarChange = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      const base64Url = await fileToBase64(file);

      mutate(
        {
          image: base64Url,
        },
        {
          async onSuccess() {
            // Revalidate all as the avatar is used in multiple places
            await revalidatePathAction("/");
          },
          onError(error) {
            if (error.shape?.data.code === "BAD_REQUEST") {
              showErrorNotification({
                title: "Image is too large",
                message: "Max image size is 256KB",
              });
            }
          },
        },
      );
    },
    [mutate],
  );

  const handleRemoveAvatar = useCallback(() => {
    openConfirmModal({
      title: "Remove avatar",
      children: "Are you sure you want to remove the avatar?",
      onConfirm() {
        mutate(
          {
            image: null,
          },
          {
            async onSuccess() {
              // Revalidate all as the avatar is used in multiple places
              await revalidatePathAction("/");
            },
          },
        );
      },
    });
  }, [mutate, openConfirmModal]);

  return (
    <Box pos="relative">
      <Menu
        opened={opened}
        keepMounted
        onChange={toggle}
        position="bottom-start"
        withArrow
      >
        <Menu.Target>
          <UnstyledButton onClick={toggle}>
            <UserAvatar user={user} size={200} />
            <Button
              component="div"
              pos="absolute"
              bottom={0}
              left={0}
              size="compact-md"
              fw="normal"
              variant="default"
              leftSection={<IconPencil size={18} stroke={1.5} />}
            >
              Edit
            </Button>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <FileButton
            onChange={handleAvatarChange}
            accept="image/png,image/jpeg"
          >
            {(props) => (
              <Menu.Item
                {...props}
                leftSection={<IconPhotoEdit size={16} stroke={1.5} />}
              >
                Change image
              </Menu.Item>
            )}
          </FileButton>
          {user.image && (
            <Menu.Item
              onClick={handleRemoveAvatar}
              leftSection={<IconPhotoX size={16} stroke={1.5} />}
            >
              Remove image
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = reject;
  });
