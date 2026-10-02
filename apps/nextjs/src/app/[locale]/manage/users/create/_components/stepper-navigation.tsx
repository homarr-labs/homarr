import { Button, Card, Group } from "@mantine/core";
import { IconArrowBackUp, IconArrowLeft, IconArrowRight, IconRotate } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

interface StepperNavigationComponentProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isComplete: boolean;
  isLoadingNextStep: boolean;
  prevStep: () => void;
  nextStep: () => void;
  reset: () => void;
}

export const StepperNavigationComponent = ({
  hasNext,
  hasPrevious,
  isComplete,
  isLoadingNextStep,
  nextStep,
  prevStep,
  reset,
}: StepperNavigationComponentProps) => {
  const tCommon = useI18n("common");
  const tCreate = useI18n("management.page.user.create");
  return (
    <Card>
      {!isComplete ? (
        <Group justify="space-between" wrap="nowrap">
          <Button
            leftSection={<IconArrowLeft size="1rem" />}
            disabled={!hasPrevious || isLoadingNextStep}
            onClick={prevStep}
          >
            {tCommon("action.previous")}
          </Button>
          <Button
            rightSection={<IconArrowRight size="1rem" />}
            disabled={!hasNext || isLoadingNextStep}
            loading={isLoadingNextStep}
            onClick={nextStep}
          >
            {tCommon("action.next")}
          </Button>
        </Group>
      ) : (
        <Group justify="end" wrap="nowrap">
          <Button variant="light" leftSection={<IconRotate size="1rem" />} onClick={reset}>
            {tCreate("action.createAnother")}
          </Button>
          <Button leftSection={<IconArrowBackUp size="1rem" />} component={Link} href="/manage/users">
            {tCreate("action.back")}
          </Button>
        </Group>
      )}
    </Card>
  );
};
