"use client";

import { Fragment } from "react";
import { Avatar, Badge, Box, Divider, Group, Image, Stack, Text, TooltipFloating, UnstyledButton } from "@mantine/core";
import { IconCalendar, IconClock, IconStarFilled } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getMantineColor } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import { mediaTypeConfigurations } from "@homarr/integrations/types";
import type { TablerIcon } from "@homarr/ui";
import { OverflowBadge } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";

export default function MediaReleasesWidget({ options, integrationIds }: WidgetComponentProps<"mediaReleases">) {
  const [releases] = clientApi.widget.mediaRelease.getMediaReleases.useSuspenseQuery({
    integrationIds,
  });

  return (
    <Stack p="xs" gap="sm">
      {releases.map((item, index) => (
        <Fragment key={item.id}>
          {index !== 0 && options.layout === "poster" && <Divider />}
          <Item item={item} options={options} />
        </Fragment>
      ))}
    </Stack>
  );
}

interface ItemProps {
  item: RouterOutputs["widget"]["mediaRelease"]["getMediaReleases"][number];
  options: WidgetComponentProps<"mediaReleases">["options"];
}

const Item = ({ item, options }: ItemProps) => {
  return (
    <TooltipFloating label={item.description} w={300} multiline disabled={item.description === undefined}>
      <UnstyledButton
        component="a"
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        pos="relative"
        p={options.layout === "poster" ? 0 : 4}
      >
        {options.layout === "backdrop" && (
          <Box
            w="100%"
            h="100%"
            pos="absolute"
            top={0}
            left={0}
            style={{
              backgroundImage: `url(${item.imageUrls.poster})`,
              borderRadius: 8,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.2,
            }}
          />
        )}
        <Group justify="space-between" h="100%" wrap="nowrap">
          <Group align="start" wrap="nowrap">
            {options.layout === "poster" && <Image w={60} src={item.imageUrls.poster} alt={item.title} />}
            <Stack gap={4}>
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
              <Group gap={6} style={{ rowGap: 0 }}>
                <Info icon={IconCalendar} label={item.releaseDate.toLocaleString()} />
                {item.length !== undefined && (
                  <>
                    <InfoDivider />
                    <Info icon={IconClock} label={item.length.toString()} />
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
                    <Info label={`$${item.price.toFixed()}`} />
                  </>
                )}
              </Group>
              {item.tags.length > 0 && (
                <OverflowBadge
                  size="xs"
                  groupGap={4}
                  data={item.tags}
                  overflowCount={3}
                  disablePopover
                  style={{ cursor: "pointer" }}
                />
              )}
            </Stack>
          </Group>
          {(options.showType || options.showSource) && (
            <Stack justify="space-between" align="end" h="100%">
              {options.showType && (
                <Badge
                  w="max-content"
                  size="xs"
                  color={mediaTypeConfigurations[item.type].color}
                  style={{ cursor: "pointer" }}
                >
                  {item.type}
                </Badge>
              )}

              {options.showSource && (
                <Avatar size="sm" radius="xl" src={getIconUrl(item.integration.kind)} alt={item.integration.name} />
              )}
            </Stack>
          )}
        </Group>
      </UnstyledButton>
    </TooltipFloating>
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
    <Group gap={4}>
      {Icon && <Icon size={12} color={getMantineColor("gray", 5)} />}
      <Text size="xs" c="gray.5">
        {label}
      </Text>
    </Group>
  );
};
