"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, PasswordInput, Stack, Stepper, Text, TextInput, Title } from "@mantine/core";
import { IconUserCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { CustomPasswordInput, UserAvatar } from "@homarr/ui";
import { validation, z } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

import { StepperNavigationComponent } from "./stepper-navigation";

export const UserCreateStepperComponent = () => {
  const t = useScopedI18n("management.page.user.create");
  const tUserField = useScopedI18n("user.field");

  const stepperMax = 4;
  const [active, setActive] = useState(0);
  const nextStep = useCallback(
    () => setActive((current) => (current < stepperMax ? current + 1 : current)),
    [setActive],
  );
  const prevStep = useCallback(() => setActive((current) => (current > 0 ? current - 1 : current)), [setActive]);
  const hasNext = active < stepperMax;
  const hasPrevious = active > 0;

  const { mutateAsync, isPending } = clientApi.user.create.useMutation({
    onError(error) {
      showErrorNotification({
        autoClose: false,
        id: "create-user-error",
        title: t("step.error.title"),
        message: error.message,
      });
    },
  });

  const generalForm = useZodForm(
    z.object({
      username: z.string().min(1),
      email: z.string().email().or(z.string().length(0).optional()),
    }),
    {
      initialValues: {
        username: "",
        email: "",
      },
    },
  );

  const securityForm = useZodForm(
    z
      .object({
        password: validation.user.password,
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        params: createCustomErrorParams({
          key: "passwordsDoNotMatch",
          params: {},
        }),
      }),
    {
      initialValues: {
        password: "",
        confirmPassword: "",
      },
    },
  );

  const allForms = useMemo(() => [generalForm, securityForm], [generalForm, securityForm]);

  const activeForm = allForms[active];
  const isCurrentFormValid = activeForm ? activeForm.isValid : () => true;
  const canNavigateToNextStep = isCurrentFormValid();

  const controlledGoToNextStep = useCallback(async () => {
    if (active + 1 === stepperMax) {
      await mutateAsync({
        username: generalForm.values.username,
        email: generalForm.values.email,
        password: securityForm.values.password,
        confirmPassword: securityForm.values.confirmPassword,
      });
    }
    nextStep();
  }, [active, generalForm, mutateAsync, securityForm, nextStep]);

  const reset = useCallback(() => {
    setActive(0);
    allForms.forEach((form) => {
      form.reset();
    });
  }, [allForms]);

  return (
    <>
      <Title mb="md">{t("title")}</Title>
      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} mb="md">
        <Stepper.Step
          label={t("step.personalInformation.label")}
          allowStepSelect={false}
          allowStepClick={false}
          color={!generalForm.isValid() ? "red" : undefined}
        >
          <form>
            <Card p="xl">
              <Stack gap="md">
                <TextInput
                  label={tUserField("username.label")}
                  variant="filled"
                  withAsterisk
                  {...generalForm.getInputProps("username")}
                />

                <TextInput label={tUserField("email.label")} variant="filled" {...generalForm.getInputProps("email")} />
              </Stack>
            </Card>
          </form>
        </Stepper.Step>
        <Stepper.Step label={t("step.security.label")} allowStepSelect={false} allowStepClick={false}>
          <form>
            <Card p="xl">
              <Stack gap="md">
                <CustomPasswordInput
                  withPasswordRequirements
                  label={tUserField("password.label")}
                  variant="filled"
                  withAsterisk
                  {...securityForm.getInputProps("password")}
                />
                <PasswordInput
                  label={tUserField("passwordConfirm.label")}
                  variant="filled"
                  withAsterisk
                  {...securityForm.getInputProps("confirmPassword")}
                />
              </Stack>
            </Card>
          </form>
        </Stepper.Step>
        <Stepper.Step
          label={t("step.permissions.label")}
          description={t("step.permissions.description")}
          allowStepSelect={false}
          allowStepClick={false}
        >
          3
        </Stepper.Step>
        <Stepper.Step label={t("step.review.label")} allowStepSelect={false} allowStepClick={false}>
          <Card p="xl">
            <Stack maw={300} align="center" mx="auto">
              <UserAvatar size="xl" user={{ name: generalForm.values.username, image: null }} />
              <Text tt="uppercase" fw="bolder" size="xl">
                {generalForm.values.username}
              </Text>
            </Stack>
          </Card>
        </Stepper.Step>
        <Stepper.Completed>
          <Card p="xl">
            <Stack align="center" maw={300} mx="auto">
              <IconUserCheck size="3rem" />
              <Title order={2}>{t("step.completed.title")}</Title>
            </Stack>
          </Card>
        </Stepper.Completed>
      </Stepper>
      <StepperNavigationComponent
        hasNext={hasNext && canNavigateToNextStep}
        hasPrevious={hasPrevious}
        isComplete={active === stepperMax}
        isLoadingNextStep={isPending}
        nextStep={controlledGoToNextStep}
        prevStep={prevStep}
        reset={reset}
      />
    </>
  );
};
