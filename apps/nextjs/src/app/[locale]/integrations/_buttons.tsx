"use client";

import { useRouter } from "next/navigation";

import { ActionIcon, IconTrash } from "@homarr/ui";

import { api } from "~/trpc/react";
import { revalidatePathAction } from "./new/action";

interface DeleteIntegrationActionButtonProps {
  count: number;
  integrationId: string;
}

export const DeleteIntegrationActionButton = ({
  count,
  integrationId,
}: DeleteIntegrationActionButtonProps) => {
  const router = useRouter();
  const { mutateAsync, isPending } = api.integration.delete.useMutation();

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      onClick={async () => {
        await mutateAsync({ id: integrationId });
        if (count === 1) {
          router.replace("/integrations");
        }
        await revalidatePathAction("/integrations");
      }}
      aria-label="Delete integration"
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
