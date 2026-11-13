"use client";

import { Fieldset, Group, SimpleGrid, Slider, Stack, Switch, Text, TextInput } from "@mantine/core";

import { IconPicker } from "@homarr/forms-collection";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { SectionCard } from "@homarr/ui";

import { AppearanceSettingsForm } from "./appearance-settings-form";
import type { FormValues } from "./settings-form";

interface BrandingSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const BrandingSettingsForm = ({ form }: BrandingSettingsFormProps) => {
  const t = useI18n("management.page.settings.section.branding");
  const logoInput = form.getInputProps("branding.logoImageUrl");
  const faviconInput = form.getInputProps("branding.faviconImageUrl");
  const backgroundInput = form.getInputProps("branding.signInBackgroundImageUrl");
  const branding = form.values.branding;

  return (
    <SectionCard title={t("title")}>
      <Stack gap="md">
        <AppearanceSettingsForm form={form} />
        <Fieldset legend={t("groups.identity")} p="sm">
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" verticalSpacing="sm">
              <TextInput label={t("appName.label")} {...form.getInputProps("branding.appName")} />
              <IconPicker
                label={t("logo.label")}
                description={null}
                placeholder={t("logo.placeholder")}
                withAsterisk={false}
                value={logoInput.value ?? ""}
                onChange={(value) => form.setFieldValue("branding.logoImageUrl", value || null)}
                error={logoInput.error}
              />
              <IconPicker
                label={t("favicon.label")}
                description={null}
                placeholder={t("favicon.placeholder")}
                withAsterisk={false}
                value={faviconInput.value ?? ""}
                onChange={(value) => form.setFieldValue("branding.faviconImageUrl", value || null)}
                error={faviconInput.error}
              />
            </SimpleGrid>
          </Stack>
        </Fieldset>

        <Fieldset legend={t("groups.authentication")} p="sm">
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm" verticalSpacing="sm">
              <TextInput label={t("greeting.label")} {...form.getInputProps("branding.greeting")} />
              <IconPicker
                label={t("signInBackground.label")}
                description={null}
                placeholder={t("signInBackground.placeholder")}
                withAsterisk={false}
                value={backgroundInput.value ?? ""}
                onChange={(value) => form.setFieldValue("branding.signInBackgroundImageUrl", value || null)}
                error={backgroundInput.error}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="sm">
              <Stack gap={6} justify="center">
                <Group justify="space-between" gap="sm">
                  <Text size="sm" fw={500}>
                    {t("signInOverlay.label")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(branding.signInBackgroundOverlay * 100)}%
                  </Text>
                </Group>
                <Slider
                  aria-label={t("signInOverlay.label")}
                  min={0}
                  max={0.9}
                  step={0.05}
                  label={(value) => `${Math.round(value * 100)}%`}
                  disabled={!branding.signInBackgroundImageUrl}
                  value={branding.signInBackgroundOverlay}
                  onChange={(value) => form.setFieldValue("branding.signInBackgroundOverlay", value)}
                />
              </Stack>

              <Stack gap={6}>
                <SimpleGrid cols={3} spacing="xs">
                  <Switch
                    size="sm"
                    label={t("authVisibility.appName")}
                    {...form.getInputProps("branding.authBranding.showAppName", { type: "checkbox" })}
                  />
                  <Switch
                    size="sm"
                    label={t("authVisibility.logo")}
                    {...form.getInputProps("branding.authBranding.showLogo", { type: "checkbox" })}
                  />
                  <Switch
                    size="sm"
                    label={t("authVisibility.greeting")}
                    {...form.getInputProps("branding.authBranding.showGreeting", { type: "checkbox" })}
                  />
                </SimpleGrid>
              </Stack>
            </SimpleGrid>
            <Switch
              label={t("signInMarquee.label")}
              description={t("signInMarquee.description")}
              {...form.getInputProps("branding.showSignInMarquee", { type: "checkbox" })}
            />
          </Stack>
        </Fieldset>
      </Stack>
    </SectionCard>
  );
};
