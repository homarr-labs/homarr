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
import type { ReactNode } from "react";

import { BoardColorInput } from "../../../../../packages/ui/src/components/board-color-input";
import { CornerStylePicker } from "../../../../../packages/ui/src/components/corner-style-picker";
import type { BrandingSettings } from "../../../../../packages/server-settings/index";
import { useI18n } from "../../../../../packages/translation/src/standalone/client";

export interface BrandingImageFieldInput {
  readonly field: "logoImageUrl" | "faviconImageUrl" | "signInBackgroundImageUrl";
  readonly label: string;
  readonly placeholder: string;
  readonly value: string | null;
  readonly disabled: boolean;
  readonly error: string | undefined;
  readonly onChange: (value: string | null) => void;
}

export interface BrandingCssFieldInput {
  readonly id: "global-custom-css";
  readonly label: string;
  readonly description: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}

export interface BrandingEditorSlots {
  readonly image?: (input: BrandingImageFieldInput) => ReactNode;
  readonly customCss?: (input: BrandingCssFieldInput) => ReactNode;
}

export function BrandingSettingsFields({
  value,
  onChange,
  disabled,
  error,
  slots,
}: {
  readonly value: BrandingSettings;
  readonly onChange: (value: BrandingSettings) => void;
  readonly disabled: boolean;
  readonly error: (path: string) => string | undefined;
  readonly slots?: BrandingEditorSlots;
}) {
  const t = useI18n("management.page.settings.section.branding");
  const change = <Key extends keyof BrandingSettings>(field: Key, next: BrandingSettings[Key]) => {
    if (!disabled) onChange({ ...value, [field]: next });
  };
  const image = (field: BrandingImageFieldInput["field"], key: "logo" | "favicon" | "signInBackground") => {
    const input = Object.freeze({
      field,
      label: t(`${key}.label`),
      placeholder: t(`${key}.placeholder`),
      value: value[field],
      disabled,
      error: error(`branding.${field}`),
      onChange: (next: string | null) => change(field, next || null),
    });
    return slots?.image ? (
      slots.image(input)
    ) : (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {input.label}
        </Text>
        <Avatar src={input.value} radius="sm" />
        <Text size="xs" c="dimmed">
          Image picker unavailable until its source controls are bound.
        </Text>
      </Stack>
    );
  };
  const css = Object.freeze({
    id: "global-custom-css" as const,
    label: t("customCss.label"),
    description: t("customCss.description"),
    value: value.customCss,
    disabled,
    error: error("branding.customCss"),
    onChange: (next: string) => change("customCss", next),
  });
  return (
    <Stack gap="md">
      <Fieldset legend={t("groups.identity")} disabled={disabled}>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {t("identity.description")}
          </Text>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <TextInput
              label={t("appName.label")}
              value={value.appName}
              error={error("branding.appName")}
              disabled={disabled}
              onChange={(event) => change("appName", event.currentTarget.value)}
            />
            {image("logoImageUrl", "logo")}
            {image("faviconImageUrl", "favicon")}
          </SimpleGrid>
        </Stack>
      </Fieldset>
      <Fieldset legend={t("groups.appearance")} disabled={disabled}>
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <BoardColorInput
                defaultColor="#fa5252"
                label={t("primaryColor.label")}
                value={value.primaryColor}
                error={error("branding.primaryColor")}
                disabled={disabled}
                onChange={(next) => change("primaryColor", next)}
              />
              <BoardColorInput
                defaultColor="#fd7e14"
                label={t("secondaryColor.label")}
                value={value.secondaryColor}
                error={error("branding.secondaryColor")}
                disabled={disabled}
                onChange={(next) => change("secondaryColor", next)}
              />
            </SimpleGrid>
            <Switch
              label={t("lockPrimaryColor.label")}
              description={t("lockPrimaryColor.description")}
              checked={value.lockPrimaryColor}
              disabled={disabled}
              onChange={(event) => change("lockPrimaryColor", event.currentTarget.checked)}
            />
          </Stack>
          <CornerStylePicker
            compact
            label={t("defaultRadius.label")}
            value={value.defaultRadius}
            labels={{
              xs: t("defaultRadius.options.xs"),
              sm: t("defaultRadius.options.sm"),
              md: t("defaultRadius.options.md"),
              lg: t("defaultRadius.options.lg"),
              xl: t("defaultRadius.options.xl"),
            }}
            onChange={(next) => {
              change("defaultRadius", next);
            }}
          />
        </SimpleGrid>
      </Fieldset>
      <Fieldset legend={t("groups.customCss")} disabled={disabled}>
        {slots?.customCss ? (
          slots.customCss(css)
        ) : (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              {css.label}
            </Text>
            <Text size="xs" c="dimmed">
              CSS editor and Workshop import unavailable until their source controls are bound. Saved CSS is retained.
            </Text>
          </Stack>
        )}
      </Fieldset>
      <Fieldset legend={t("groups.authentication")} disabled={disabled}>
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label={t("greeting.label")}
              value={value.greeting}
              error={error("branding.greeting")}
              disabled={disabled}
              onChange={(event) => change("greeting", event.currentTarget.value)}
            />
            {image("signInBackgroundImageUrl", "signInBackground")}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  {t("signInOverlay.label")}
                </Text>
                <Text size="xs" c="dimmed">
                  {Math.round(value.signInBackgroundOverlay * 100)}%
                </Text>
              </Group>
              <Slider
                aria-label={t("signInOverlay.label")}
                min={0}
                max={0.9}
                step={0.05}
                label={(next) => `${Math.round(next * 100)}%`}
                disabled={disabled || !value.signInBackgroundImageUrl}
                value={value.signInBackgroundOverlay}
                onChange={(next) => change("signInBackgroundOverlay", next)}
              />
            </Stack>
            <Stack gap={6}>
              <Text size="sm" c="dimmed">
                {t("authVisibility.description")}
              </Text>
              <SimpleGrid cols={3}>
                {(["showAppName", "showLogo", "showGreeting"] as const).map((field) => (
                  <Switch
                    key={field}
                    size="sm"
                    label={t(
                      `authVisibility.${field === "showAppName" ? "appName" : field === "showLogo" ? "logo" : "greeting"}`,
                    )}
                    checked={value.authBranding[field]}
                    disabled={disabled}
                    onChange={(event) =>
                      change("authBranding", { ...value.authBranding, [field]: event.currentTarget.checked })
                    }
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </SimpleGrid>
        </Stack>
      </Fieldset>
      <BrandingSummary value={value} />
    </Stack>
  );
}

function BrandingSummary({ value }: { readonly value: BrandingSettings }) {
  const t = useI18n("management.page.settings.section.branding");
  const logo = value.logoImageUrl || "/logo/logo.png";
  return (
    <Paper withBorder p="sm" radius={value.defaultRadius}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={650}>{t("summary.title")}</Text>
          <Badge variant="light">
            {t("summary.cornerStyle")}: {t(`defaultRadius.options.${value.defaultRadius}`)}
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
          <Group gap="xs">
            <Avatar.Group>
              <Avatar src={logo} alt={t("logo.label")} />
              <Avatar src={value.faviconImageUrl || logo} alt={t("favicon.label")} />
            </Avatar.Group>
            <Text fw={600}>{value.appName.trim() || "Homarr"}</Text>
          </Group>
          <Stack gap={6}>
            <Text size="xs" fw={700} c="dimmed">
              {t("summary.palette")}
            </Text>
            <Group>
              {(["primaryColor", "secondaryColor"] as const).map((field) => (
                <Group key={field} gap={6}>
                  <ColorSwatch color={value[field]} size={20} />
                  <Text size="xs">{value[field]}</Text>
                </Group>
              ))}
            </Group>
            <Badge variant="light" w="fit-content">
              {t(value.lockPrimaryColor ? "summary.boardColorLocked" : "summary.boardColorFlexible")}
            </Badge>
          </Stack>
          <Stack gap={6}>
            <Text size="sm">
              {value.signInBackgroundImageUrl
                ? t("summary.backgroundConfigured", { overlay: Math.round(value.signInBackgroundOverlay * 100) })
                : t("summary.backgroundDefault")}{" "}
              · {t(value.greeting.trim() ? "summary.greetingConfigured" : "summary.greetingDefault")}
            </Text>
            <Group gap={4}>
              {(["showAppName", "showLogo", "showGreeting"] as const).map((field) => (
                <Badge key={field} size="xs" color={value.authBranding[field] ? "green" : "gray"}>
                  {t(`summary.${field === "showAppName" ? "appName" : field === "showLogo" ? "logo" : "greeting"}`)}:{" "}
                  {t(value.authBranding[field] ? "summary.on" : "summary.off")}
                </Badge>
              ))}
            </Group>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
