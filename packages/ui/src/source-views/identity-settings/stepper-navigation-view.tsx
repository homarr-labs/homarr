"use client";

import { Button, Card, Group } from "@mantine/core";
import { IconArrowBackUp, IconArrowLeft, IconArrowRight, IconRotate } from "@tabler/icons-react";

import type { IdentitySettingsLinkProps, StepperNavigationViewProps } from "./contracts";

export const StepperNavigationView = ({
  hasNext,
  hasPrevious,
  isComplete,
  isLoadingNextStep,
  nextStep,
  prevStep,
  reset,
  previousLabel,
  nextLabel,
  createAnotherLabel,
  backLabel,
  backHref,
  linkComponent: LinkComponent,
}: StepperNavigationViewProps) => {
  return (
    <Card>
      {!isComplete ? (
        <Group justify="space-between" wrap="nowrap">
          <Button
            leftSection={<IconArrowLeft size="1rem" />}
            disabled={!hasPrevious || isLoadingNextStep}
            onClick={prevStep}
          >
            {previousLabel}
          </Button>
          <Button
            rightSection={<IconArrowRight size="1rem" />}
            disabled={!hasNext || isLoadingNextStep}
            loading={isLoadingNextStep}
            onClick={nextStep}
          >
            {nextLabel}
          </Button>
        </Group>
      ) : (
        <Group justify="end" wrap="nowrap">
          <Button variant="light" leftSection={<IconRotate size="1rem" />} onClick={reset}>
            {createAnotherLabel}
          </Button>
          <Button
            leftSection={<IconArrowBackUp size="1rem" />}
            component="a"
            href={backHref}
            renderRoot={(props: IdentitySettingsLinkProps) => <LinkComponent {...props} />}
          >
            {backLabel}
          </Button>
        </Group>
      )}
    </Card>
  );
};
