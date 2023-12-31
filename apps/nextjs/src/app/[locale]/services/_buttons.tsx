"use client";

import { ActionIcon, IconTrash, IconTrashOff, Tooltip } from "@homarr/ui";

import { api } from "~/trpc/react";
import { revalidatePathAction } from "../integrations/new/action";

interface DeleteIntegrationActionButtonProps {
  hasRelations: boolean;
  serviceId: string;
}

export const DeleteServiceActionButton = ({
  hasRelations,
  serviceId,
}: DeleteIntegrationActionButtonProps) => {
  const { mutateAsync, isPending } = api.service.delete.useMutation();

  const Icon = hasRelations ? IconTrashOff : IconTrash;

  return (
    <Tooltip
      label={hasRelations ? "This service is still used" : "Delete service"}
      position="right"
    >
      <ActionIcon
        variant="subtle"
        color="red"
        loading={isPending}
        disabled={hasRelations}
        onClick={async () => {
          if (hasRelations) return;
          await mutateAsync({ id: serviceId });

          await revalidatePathAction("/services");
        }}
      >
        <Icon color="red" size={16} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
};
