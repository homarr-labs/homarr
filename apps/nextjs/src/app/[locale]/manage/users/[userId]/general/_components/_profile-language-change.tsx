import { Stack, Title } from "@mantine/core";

import { LanguageCombobox } from "~/components/language/language-combobox";

export const ProfileLanguageChange = () => {
  return (
    <Stack mb="lg">
      <Title order={2}>Language & Region</Title>
      <LanguageCombobox />
    </Stack>
  );
};
