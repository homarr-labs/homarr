import { useState } from "react";
import type { FormEventHandler, ReactNode } from "react";
import {
  Button,
  Center,
  Combobox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import type { ButtonProps } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

import { SelectWithCustomItems } from "../../../../../packages/ui/src/components/select-with-custom-items";
import type { GroupPresentation, GroupUserPresentation } from "./contracts";

export interface GroupNameFormProps {
  name: string;
  error: ReactNode;
  disabled: boolean;
  isPending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function GroupCreateForm({
  name,
  error,
  disabled,
  isPending,
  onNameChange,
  onSubmit,
  onCancel,
}: GroupNameFormProps & { onCancel: () => void }) {
  const tCommon = useI18n("common");
  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <TextInput
          label={tCommon("field.name")}
          autoFocus
          value={name}
          error={error}
          onChange={(event) => onNameChange(event.currentTarget.value)}
        />
        <Group justify="end">
          <Button variant="default" onClick={onCancel} disabled={isPending}>
            {tCommon("action.cancel")}
          </Button>
          <Button loading={isPending} type="submit" disabled={disabled}>
            {tCommon("action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function RenameGroupForm({
  name,
  error,
  disabled,
  isPending,
  onNameChange,
  onSubmit,
  reserved,
}: GroupNameFormProps & { reserved: boolean }) {
  const tCommon = useI18n("common");
  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <TextInput
          label={tCommon("field.name")}
          value={name}
          error={error}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          disabled={reserved}
        />
        {!reserved && (
          <Group justify="end">
            <Button type="submit" loading={isPending} disabled={disabled}>
              {tCommon("action.saveChanges")}
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}

export interface UserAccessPickerProps {
  users: GroupUserPresentation[];
  presentation: GroupPresentation;
  presentUserIds: string[];
  isPending: boolean;
  triggerLabel: string;
  triggerProps?: Omit<ButtonProps, "children" | "loading" | "onClick" | "type">;
  onSelect: (user: GroupUserPresentation) => void | Promise<void>;
}

export function UserAccessPicker({
  users,
  presentation,
  presentUserIds,
  isPending,
  triggerLabel,
  triggerProps,
  onSelect,
}: UserAccessPickerProps) {
  const tUser = useI18n("user.action.select");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
      requestAnimationFrame(() => combobox.focusTarget());
    },
    onDropdownOpen: () => {
      combobox.selectFirstOption();
      requestAnimationFrame(() => combobox.focusSearchInput());
    },
  });
  const options = users.filter((user) => !presentUserIds.includes(user.id));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter(
    (user) =>
      !normalizedSearch || [user.name ?? "", user.email ?? ""].join(" ").toLowerCase().includes(normalizedSearch),
  );
  const handleSelect = async (value: string) => {
    const user = options.find((option) => option.id === value);
    if (!user || isPending || isSubmitting || triggerProps?.disabled) return;
    combobox.closeDropdown();
    setIsSubmitting(true);
    try {
      await onSelect(user);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(value) => void handleSelect(value).catch(() => undefined)}
      width="target"
      withinPortal
    >
      <Combobox.Target targetType="button">
        <Button
          {...triggerProps}
          onClick={() => combobox.toggleDropdown()}
          rightSection={
            <Group gap={4} wrap="nowrap">
              {triggerProps?.rightSection}
              <Combobox.Chevron />
            </Group>
          }
          loading={isSubmitting}
          disabled={isSubmitting || triggerProps?.disabled}
        >
          {triggerLabel}
        </Button>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.updateSelectedOptionIndex();
          }}
          placeholder={tUser("label")}
          aria-label={tUser("label")}
        />
        <ScrollArea.Autosize mah={300} type="auto">
          <Combobox.Options>
            {isPending && (
              <Center p="md">
                <Loader size="sm" />
              </Center>
            )}
            {!isPending && filteredOptions.length === 0 && <Combobox.Empty>{tUser("notFound")}</Combobox.Empty>}
            {!isPending &&
              filteredOptions.slice(0, 5).map((user) => (
                <Combobox.Option value={user.id} key={user.id}>
                  <Group wrap="nowrap" gap="xs">
                    {presentation.renderAvatar(user, "xs")}
                    <Stack gap={0}>
                      <Text size="sm">{user.name}</Text>
                      {user.email && (
                        <Text size="xs" c="dimmed">
                          {user.email}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Combobox.Option>
              ))}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export interface GroupHomeBoardsProps {
  boards: { id: string; name: string; logoImageUrl: string | null }[];
  homeBoardId: string | null;
  mobileHomeBoardId: string | null;
  isPending: boolean;
  disabled: boolean;
  onHomeBoardChange: (id: string | null) => void;
  onMobileHomeBoardChange: (id: string | null) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

function BoardOption({ label, image }: { value: string; label: string; image: string | null }) {
  return (
    <Group>
      {image ? <img width={16} height={16} src={image} alt={label} /> : <IconLayoutDashboard size={16} />}
      <Text fz="sm" fw={500}>
        {label}
      </Text>
    </Group>
  );
}

export function GroupHomeBoards({
  boards,
  homeBoardId,
  mobileHomeBoardId,
  isPending,
  disabled,
  onHomeBoardChange,
  onMobileHomeBoardChange,
  onSubmit,
}: GroupHomeBoardsProps) {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  const data = boards.map((board) => ({ value: board.id, label: board.name, image: board.logoImageUrl }));
  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <SelectWithCustomItems
          label={tGroup("field.homeBoard.label")}
          description={tGroup("field.homeBoard.description")}
          clearable
          data={data}
          SelectOption={BoardOption}
          value={homeBoardId}
          onChange={onHomeBoardChange}
        />
        <SelectWithCustomItems
          label={tGroup("field.mobileBoard.label")}
          description={tGroup("field.mobileBoard.description")}
          clearable
          data={data}
          SelectOption={BoardOption}
          value={mobileHomeBoardId}
          onChange={onMobileHomeBoardChange}
        />
        <Group justify="end">
          <Button type="submit" loading={isPending} disabled={disabled}>
            {tCommon("action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
