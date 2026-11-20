import type { CSSProperties } from "react";
import { SimpleGrid, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconAffiliateFilled,
  IconArrowUpRight,
  IconBox,
  IconLayoutDashboardFilled,
  IconMailForward,
  IconPhotoFilled,
  IconSearch,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { Link } from "@homarr/ui";

import classes from "./management-home.module.css";

export type StatisticKey = "app" | "board" | "group" | "integration" | "invite" | "media" | "searchEngine" | "user";

export interface StatisticTile {
  key: StatisticKey;
  count: number;
  path: string;
  title: string;
  category: string;
}

const icons: Record<StatisticKey, TablerIcon> = {
  app: IconBox,
  board: IconLayoutDashboardFilled,
  group: IconUsersGroup,
  integration: IconAffiliateFilled,
  invite: IconMailForward,
  media: IconPhotoFilled,
  searchEngine: IconSearch,
  user: IconUsers,
};

export const StatisticTiles = ({ statistics }: { statistics: StatisticTile[] }) => (
  <SimpleGrid cols={{ base: 2, md: 3, xl: 4 }} spacing="md">
    {statistics.map((statistic, index) => {
      const Icon = icons[statistic.key];

      return (
        <UnstyledButton
          key={statistic.key}
          component={Link}
          href={statistic.path}
          className={classes.tile}
          style={{ "--i": index } as CSSProperties}
          aria-label={`${statistic.count} ${statistic.title}`}
        >
          <ThemeIcon variant="light" size={44} radius="md" className={classes.icon} aria-hidden="true">
            <Icon size={24} stroke={1.5} />
          </ThemeIcon>
          <IconArrowUpRight className={classes.arrow} size={18} stroke={1.75} aria-hidden="true" />
          <span className={classes.count}>{statistic.count}</span>
          <Text fw={600} mt={6}>
            {statistic.title}
          </Text>
          <Text size="xs" c="dimmed">
            {statistic.category}
          </Text>
        </UnstyledButton>
      );
    })}
  </SimpleGrid>
);
