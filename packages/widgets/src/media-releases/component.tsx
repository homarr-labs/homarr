"use client";

import { Fragment } from "react";
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Group,
  Image,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconBook, IconCalendar, IconClock, IconStarFilled } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getMantineColor, toValidDate } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import type { MediaRelease } from "@homarr/integrations/types";
import { mediaTypeConfigurations } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { OverflowBadge } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import classes from "./component.module.css";

export default function MediaReleasesWidget({
  options,
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"mediaReleases">) {
  const releasesQuery = clientApi.widget.mediaRelease.getMediaReleases.useQuery({ integrationIds });
  const response = getUsableWidgetQueryData(releasesQuery);

  if (isInitialWidgetQueryPending(releasesQuery)) return <WidgetQueryLoadingState />;
  if (!response) return <WidgetEmptyState />;

  const { releases, failedIntegrations } = response;

  const isAdvanced = displayMode === "advanced";

  return (
    <Box h="100%" pos="relative">
      {releases.length === 0 ? (
        <WidgetEmptyState />
      ) : (
        <ScrollArea h="100%">
          <SimpleGrid cols={isAdvanced ? Math.max(1, Math.floor(width / 360)) : 1} p="xs" spacing="sm">
            {releases.map((item, index) => (
              <Fragment key={`${item.integration.id}:${item.id}`}>
                {!isAdvanced && index !== 0 && options.layout === "poster" && <Divider />}
                <Item item={item} options={options} isAdvanced={isAdvanced} />
              </Fragment>
            ))}
          </SimpleGrid>
        </ScrollArea>
      )}
      {failedIntegrations.length > 0 && (
        <Group pos="absolute" top={4} right={4} gap={0}>
          <IntegrationErrorIndicator results={failedIntegrations} />
        </Group>
      )}
    </Box>
  );
}

interface ItemProps {
  item: RouterOutputs["widget"]["mediaRelease"]["getMediaReleases"]["releases"][number];
  options: WidgetComponentProps<"mediaReleases">["options"];
  isAdvanced: boolean;
}

const formatReleaseDate = (value: unknown, locale: string) => {
  const date = toValidDate(value);
  if (!date) return "—";
  return Intl.DateTimeFormat(locale, {
    month: "2-digit",
    year: "numeric",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const Item = ({ item, options, isAdvanced }: ItemProps) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.mediaReleases");
  const length = formatLength(item.length, item.type, t);
  const showPoster = isAdvanced || options.layout === "poster";
  const showSide = isAdvanced || options.showType || options.showSource;
  const href = getSafeApplicationUrl(item.href);

  return (
    <Tooltip
      label={item.description}
      w={300}
      multiline
      events={{ hover: true, focus: true, touch: true }}
      disabled={
        isAdvanced ||
        item.description === undefined ||
        item.description.trim() === "" ||
        !options.showDescriptionTooltip
      }
    >
      <UnstyledButton
        className={classes.item}
        data-defer-rendering={isAdvanced ? undefined : true}
        component={href ? "a" : "div"}
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? SAFE_NEW_TAB_REL : undefined}
        pos="relative"
        p={isAdvanced ? "sm" : options.layout === "poster" ? 0 : 4}
        h="100%"
        title={item.title}
        style={
          isAdvanced
            ? {
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: "var(--mantine-radius-sm)",
              }
            : undefined
        }
      >
        {!isAdvanced && options.layout === "backdrop" && (
          <Box
            w="100%"
            h="100%"
            pos="absolute"
            top={0}
            left={0}
            style={{
              backgroundImage: `url(${item.imageUrls.backdrop})`,
              borderRadius: 8,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.2,
            }}
          />
        )}
        <Group justify="space-between" h="100%" wrap="nowrap" gap={isAdvanced ? "sm" : undefined}>
          <Group align="start" wrap="nowrap" style={{ zIndex: 0, minWidth: 0, flex: 1 }} gap="xs">
            {showPoster && (
              <Image
                w={isAdvanced ? 80 : 60}
                src={item.imageUrls.poster}
                alt={isAdvanced ? "" : item.title}
                radius={isAdvanced ? "xs" : undefined}
                loading="lazy"
                style={{ flexShrink: 0 }}
              />
            )}
            <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
              <Stack gap={0}>
                <Text size="sm" fw="bold" lineClamp={2}>
                  {item.title}
                </Text>
                {item.subtitle !== undefined && (
                  <Text size="sm" lineClamp={1}>
                    {item.subtitle}
                  </Text>
                )}
              </Stack>
              <Group
                gap={6}
                wrap={isAdvanced ? "nowrap" : "wrap"}
                style={isAdvanced ? { minWidth: 0 } : { minWidth: 0, rowGap: 0 }}
              >
                <Info icon={IconCalendar} label={formatReleaseDate(item.releaseDate, locale)} />
                {length !== undefined && (
                  <>
                    <InfoDivider />
                    <Info icon={length.type === "duration" ? IconClock : IconBook} label={length.label} />
                  </>
                )}
                {item.producer !== undefined && (
                  <>
                    <InfoDivider />
                    <Info label={item.producer} />
                  </>
                )}
                {item.rating !== undefined && (
                  <>
                    <InfoDivider />
                    <Info icon={IconStarFilled} label={item.rating} />
                  </>
                )}
                {item.price !== undefined && (
                  <>
                    <InfoDivider />
                    <Info label={`$${item.price.toFixed(2)}`} />
                  </>
                )}
              </Group>
              {item.tags.length > 0 && (
                <OverflowBadge
                  size="xs"
                  groupGap={4}
                  data={item.tags}
                  overflowCount={3}
                  disablePopover={!isAdvanced}
                  style={{ cursor: isAdvanced ? "pointer" : undefined }}
                />
              )}
              {isAdvanced && item.description && (
                <Text size="xs" c="dimmed">
                  {item.description}
                </Text>
              )}
            </Stack>
          </Group>
          {showSide && (
            <Stack justify="space-between" align="end" h="100%" style={{ zIndex: 0 }}>
              {(isAdvanced || options.showType) && (
                <Badge
                  w="max-content"
                  size="xs"
                  color={mediaTypeConfigurations[item.type].color}
                  style={{ cursor: "pointer" }}
                >
                  {item.type}
                </Badge>
              )}

              {(isAdvanced || options.showSource) &&
                (isAdvanced ? (
                  <Group gap={4} wrap="nowrap">
                    <Avatar size="sm" radius="xl" src={getIconUrl(item.integration.kind)} alt="" />
                    <Text size="xs" fw={500} lineClamp={1}>
                      {item.integration.name}
                    </Text>
                  </Group>
                ) : (
                  <Avatar size="sm" radius="xl" src={getIconUrl(item.integration.kind)} alt={item.integration.name} />
                ))}
            </Stack>
          )}
        </Group>
      </UnstyledButton>
    </Tooltip>
  );
};

interface IconAndLabelProps {
  icon?: TablerIcon;
  label: string;
}

const InfoDivider = () => (
  <Text size="xs" c="dimmed">
    •
  </Text>
);

const Info = ({ icon: Icon, label }: IconAndLabelProps) => {
  return (
    <Group gap={4} wrap="nowrap" miw={0}>
      {Icon && <Icon size="var(--mantine-font-size-xs)" color={getMantineColor("gray", 5)} style={{ flexShrink: 0 }} />}
      <Text size="xs" c="dimmed" truncate="end">
        {label}
      </Text>
    </Group>
  );
};

const formatLength = (
  length: number | undefined,
  type: MediaRelease["type"],
  t: ScopedTranslationFunction<"widget.mediaReleases">,
) => {
  if (!length) return undefined;
  if (type === "movie" || type === "tv" || type === "video" || type === "music" || type === "article") {
    return {
      type: "duration" as const,
      label: t("length.duration", {
        length: Math.round(length / 60).toString(),
      }),
    };
  }
  if (type === "book") {
    return {
      type: "page" as const,
      label: length.toString(),
    };
  }

  return undefined;
};
