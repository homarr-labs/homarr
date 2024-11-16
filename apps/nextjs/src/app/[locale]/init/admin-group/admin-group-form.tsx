"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, GridCol, Group, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import classes from "../init.module.css";

const nextStepPath = "/init/settings";

export const InitExternalAdminGroupForm = () => {
  const { mutateAsync } = clientApi.onboarding.initExternalAdminGroup.useMutation();
  const form = useZodForm(validation.group.init, {});
  const router = useRouter();

  const handleSubmitAsync = async (values: z.infer<typeof validation.group.init>) => {
    await mutateAsync(values, {
      onSuccess() {
        showSuccessNotification({
          title: "Admin group created",
          message: "Admin group has been created successfully",
        });
        router.push(nextStepPath);
      },
      onError(error) {
        showErrorNotification({
          title: "Failed to create admin group",
          message: error.message,
        });
      },
    });
  };

  return (
    <GridCol span={12}>
      <Card className={classes.card} w="100%">
        <Stack>
          <Text fw={500}>Create admin group for OIDC or LDAP</Text>

          <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
            <Stack gap="md">
              <TextInput
                {...form.getInputProps("name")}
                label="Name"
                description="The name has to match the name provided from the external provider"
              />

              <Group justify="space-between">
                <Button variant="subtle" color="gray" onClick={() => router.back()}>
                  Back
                </Button>

                <Group>
                  <Button component={Link} href={nextStepPath} variant="subtle">
                    Skip step
                  </Button>
                  <Button type="submit">Continue</Button>
                </Group>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Card>
    </GridCol>
  );
};
