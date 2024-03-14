import { createManagedModal } from "mantine-modal-manager";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { Button, Group, Select, Stack } from "@homarr/ui";

interface InnerProps {
  presentUserIds: string[];
  onSelect: (props: { id: string; name: string }) => void;
}

interface FormType {
  userId: string;
}

export const UserSelectModal = createManagedModal<InnerProps>(
  ({ actions, innerProps }) => {
    const { data: users } = clientApi.user.getAll.useQuery();
    const form = useForm<FormType>();
    const handleSubmit = (v: FormType) => {
      const currentUser = users?.find((user) => user.id === v.userId);
      console.log();
      if (!currentUser) return;
      innerProps.onSelect({
        id: currentUser.id,
        name: currentUser.name ?? "",
      });
      actions.closeModal();
    };

    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            {...form.getInputProps("userId")}
            data={users?.map((u) => ({ value: u.id, label: u.name ?? "" }))}
          />
          <Group justify="end">
            <Button onClick={actions.closeModal}>Close</Button>
            <Button type="submit">Add user</Button>
          </Group>
        </Stack>
      </form>
    );
  },
);
