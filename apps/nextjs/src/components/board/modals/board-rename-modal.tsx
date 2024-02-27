"use client";

import type { ManagedModal } from "mantine-modal-manager";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { Button, Group, Stack, TextInput } from "@homarr/ui";
import type { validation, z } from "@homarr/validation";

interface InnerProps {
  id: string;
  previousName: string;
  onSuccess?: (name: string) => void;
}

export const BoardRenameModal: ManagedModal<InnerProps> = ({
  actions,
  innerProps,
}) => {
  const { mutate, isPending } = clientApi.board.rename.useMutation();
  const form = useForm<FormType>({
    initialValues: {
      name: innerProps.previousName,
    },
  });

  const handleSubmit = (values: FormType) => {
    mutate(
      {
        id: innerProps.id,
        name: values.name,
      },
      {
        onSuccess: () => {
          actions.closeModal();
          innerProps.onSuccess?.(values.name);
        },
      },
    );
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} data-autofocus />
        <Group align="end">
          <Button onClick={actions.closeModal}>Cancel</Button>
          <Button type="submit" loading={isPending}>
            Rename
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<z.infer<(typeof validation)["board"]["rename"]>, "id">;
