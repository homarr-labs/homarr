"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { IntegrationSort } from "@homarr/db/schema/items";
import { ActionIcon, IconPlus, IconTrash } from "@homarr/ui";

import { api } from "~/trpc/react";
import { revalidatePathAction } from "./new/action";

interface NewIntegrationFromSortActionButtonProps {
  sort: IntegrationSort;
}

export const NewIntegrationFromSortActionButton = ({
  sort,
}: NewIntegrationFromSortActionButtonProps) => {
  return (
    <ActionIcon
      variant="subtle"
      color="teal"
      component={Link}
      href={`/integrations/new?sort=${sort}`}
      onClick={(e) => e.stopPropagation()}
    >
      <IconPlus size={20} stroke={1.5} />
    </ActionIcon>
  );
};

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
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
