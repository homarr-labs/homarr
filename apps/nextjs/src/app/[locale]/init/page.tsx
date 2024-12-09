import { Center, Stack, Text, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import type { OnboardingStep } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";

import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { InitGroup } from "./_steps/group/init-group";
import { InitImport } from "./_steps/import/init-import";
import { InitSettings } from "./_steps/settings/init-settings";
import { InitStart } from "./_steps/start/init-start";
import { InitUser } from "./_steps/user/init-user";

const stepComponents: Record<OnboardingStep, null | (() => JSX.Element)> = {
  start: InitStart,
  import: InitImport,
  user: InitUser,
  group: InitGroup,
  settings: InitSettings,
  searchEngines: null,
  board: null,
  finish: null,
};

export default async function InitPage() {
  const t = await getScopedI18n("init.step");
  // Steps:
  // 1. Import existing data from another system
  // 2. Create a new user (if credentials provider and not present with admin rights in old system) (Also creates admin group)
  // 3. Create a new group (if external provider, skippable)
  // 4. Server settings like analytics /  (skippable)
  // 5. Search engines (skippable)
  // 6. Create a new board (skippable and only when no boards are present)

  const currentStep = await api.onboard.currentStep();

  const CurrentComponent = stepComponents[currentStep];

  return (
    <Center>
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            {t(`${currentStep}.title`)}
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            {t(`${currentStep}.subtitle`)}
          </Text>
        </Stack>
        {CurrentComponent && <CurrentComponent />}
      </Stack>
    </Center>
  );
}
