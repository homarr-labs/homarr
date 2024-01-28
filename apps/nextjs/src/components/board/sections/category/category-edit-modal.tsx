import type { ManagedModal } from "mantine-modal-manager";

import { useForm } from "@homarr/form";
import { Button, Group, Stack, TextInput } from "@homarr/ui";

interface Category {
  id: string;
  name: string;
}

interface InnerProps {
  submitLabel: string;
  category: Category;
  onSuccess: (category: Category) => void;
}

export const CategoryEditModal: ManagedModal<InnerProps> = ({
  actions,
  innerProps,
}) => {
  const form = useForm({
    initialValues: {
      name: innerProps.category.name,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((v) => {
        void innerProps.onSuccess({
          ...innerProps.category,
          name: v.name,
        });
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput
          label="Name"
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Group justify="right">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            Cancel
          </Button>
          <Button type="submit" color="teal">
            {innerProps.submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
