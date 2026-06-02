import { Stack, Text } from "@mantine/core";
import { IconFileImport, IconPlayerPlay } from "@tabler/icons-react";

import { getMantineColor } from "@homarr/common";
import { getScopedI18n } from "@homarr/translation/server";

import { InitStepCard } from "../../_components/init-step-card";
import { InitStartButton } from "./next-button";

export const InitStart = async () => {
  const tStart = await getScopedI18n("init.step.start");

  return (
    <InitStepCard>
      <Stack>
        <Text>{tStart("description")}</Text>

        <InitStartButton
          preferredStep={undefined}
          icon={<IconPlayerPlay color={getMantineColor("green", 6)} size={16} stroke={1.5} />}
        >
          {tStart("action.scratch")}
        </InitStartButton>
        <InitStartButton
          preferredStep="import"
          icon={<IconFileImport color={getMantineColor("cyan", 6)} size={16} stroke={1.5} />}
        >
          {tStart("action.importOldmarr")}
        </InitStartButton>
      </Stack>
    </InitStepCard>
  );
};
