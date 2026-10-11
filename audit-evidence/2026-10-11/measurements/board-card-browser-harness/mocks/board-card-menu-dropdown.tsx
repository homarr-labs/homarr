import { Menu } from "@mantine/core";

interface Props {
  onDuplicate: () => void;
}

export const BoardCardMenuDropdown = ({ onDuplicate }: Props) => {
  const canCreate = new URLSearchParams(window.location.search).get("permission") !== "none";
  return (
    <Menu.Dropdown>
      {canCreate && <Menu.Item onClick={onDuplicate}>Duplicate board</Menu.Item>}
    </Menu.Dropdown>
  );
};
