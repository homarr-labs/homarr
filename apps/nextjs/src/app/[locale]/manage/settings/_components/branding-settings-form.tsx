"use client";

import {
  Avatar,
  Badge,
  ColorSwatch,
  Fieldset,
  Group,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";

import { IconPicker } from "@homarr/forms-collection";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput, CornerStylePicker, cornerStyleValues } from "@homarr/ui";

import { SectionCard } from "~/components/manage/section-card";
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
        <Fieldset legend={t("groups.identity")} p="sm">
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {t("identity.description")}
            </Text>
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

        <Fieldset legend={t("groups.appearance")} p="sm">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" verticalSpacing="sm">
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <BoardColorInput
                  label={t("primaryColor.label")}
                  defaultColor="#fa5252"
                  {...form.getInputProps("branding.primaryColor")}
                />
                <BoardColorInput
                  label={t("secondaryColor.label")}
                  defaultColor="#fd7e14"
                  {...form.getInputProps("branding.secondaryColor")}
                />
              </SimpleGrid>
              <Switch
                label={t("lockPrimaryColor.label")}
                description={t("lockPrimaryColor.description")}
                {...form.getInputProps("branding.lockPrimaryColor", { type: "checkbox" })}
              />
            </Stack>
            <CornerStylePicker
              compact
              label={t("defaultRadius.label")}
              value={branding.defaultRadius}
              labels={
                Object.fromEntries(
                  cornerStyleValues.map((cornerStyle) => [cornerStyle, t(`defaultRadius.options.${cornerStyle}`)]),
                ) as Record<(typeof cornerStyleValues)[number], string>
              }
              onChange={(cornerStyle) => form.setFieldValue("branding.defaultRadius", cornerStyle)}
            />
          </SimpleGrid>
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
                <Text size="sm" c="dimmed">
                  {t("authVisibility.description")}
                </Text>
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
          </Stack>
        </Fieldset>

        <BrandingSummary form={form} />
      </Stack>
    </SectionCard>
  );
};

const BrandingSummary = ({ form }: BrandingSettingsFormProps) => {
  const t = useI18n("management.page.settings.section.branding");
  const branding = form.values.branding;
  const appName = branding.appName.trim() || "Homarr";
  const logoImageUrl = branding.logoImageUrl || "/logo/logo.png";
  const faviconImageUrl = branding.faviconImageUrl || logoImageUrl;
  const backgroundStatus = branding.signInBackgroundImageUrl
    ? t("summary.backgroundConfigured", { overlay: Math.round(branding.signInBackgroundOverlay * 100) })
    : t("summary.backgroundDefault");
  const greetingStatus = branding.greeting.trim() ? t("summary.greetingConfigured") : t("summary.greetingDefault");

  return (
    <Paper withBorder p="sm" radius={branding.defaultRadius}>
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="wrap">
          <Text fw={650}>{t("summary.title")}</Text>
          <Badge variant="light">
            {t("summary.cornerStyle")}: {t(`defaultRadius.options.${branding.defaultRadius}`)}
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md" verticalSpacing="sm">
          <Stack gap={6}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t("groups.identity")}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Avatar.Group>
                <Avatar src={logoImageUrl} alt={t("logo.label")} />
                <Avatar src={faviconImageUrl} alt={t("favicon.label")} />
              </Avatar.Group>
              <Text size="sm" fw={600} truncate>
                {appName}
              </Text>
            </Group>
          </Stack>

          <Stack gap={6}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t("summary.palette")}
            </Text>
            <Group gap="md">
              <Group gap={6} wrap="nowrap">
                <ColorSwatch color={branding.primaryColor} size={20} />
                <Text size="xs">{branding.primaryColor}</Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <ColorSwatch color={branding.secondaryColor} size={20} />
                <Text size="xs">{branding.secondaryColor}</Text>
              </Group>
            </Group>
            <Badge color={branding.lockPrimaryColor ? "primaryColor" : "gray"} variant="light" w="fit-content">
              {branding.lockPrimaryColor ? t("summary.boardColorLocked") : t("summary.boardColorFlexible")}
            </Badge>
          </Stack>

          <Stack gap={6}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t("groups.authentication")}
            </Text>
            <Text size="sm">
              {backgroundStatus} · {greetingStatus}
            </Text>
            <Group gap={4}>
              <VisibilityBadge label={t("summary.appName")} visible={branding.authBranding.showAppName} />
              <VisibilityBadge label={t("summary.logo")} visible={branding.authBranding.showLogo} />
              <VisibilityBadge label={t("summary.greeting")} visible={branding.authBranding.showGreeting} />
            </Group>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};

const VisibilityBadge = ({ label, visible }: { label: string; visible: boolean }) => {
  const t = useI18n("management.page.settings.section.branding.summary");

  return (
    <Badge size="xs" color={visible ? "green" : "gray"} variant="light">
      {label}: {visible ? t("on") : t("off")}
    </Badge>
  );
};
