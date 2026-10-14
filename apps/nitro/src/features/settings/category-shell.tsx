import { Stack, Tabs, Title } from "@mantine/core";
import type { ReactNode } from "react";

export interface SettingsCategory {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export interface SettingsCategoryShellInput {
  readonly title: string;
  readonly categories: readonly SettingsCategory[];
  readonly selectedCategory: string | null;
  readonly onSelectCategory: (category: string | null) => void;
}

export function SettingsCategoryShell({
  title,
  categories,
  selectedCategory,
  onSelectCategory,
}: SettingsCategoryShellInput) {
  return (
    <Stack gap="lg">
      <Title order={2}>{title}</Title>
      <Tabs value={selectedCategory} onChange={onSelectCategory} keepMounted={false}>
        <Tabs.List>
          {categories.map((category) => (
            <Tabs.Tab key={category.id} value={category.id} disabled={category.disabled}>
              {category.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {categories.map((category) => (
          <Tabs.Panel key={category.id} value={category.id} pt="lg">
            {category.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}
