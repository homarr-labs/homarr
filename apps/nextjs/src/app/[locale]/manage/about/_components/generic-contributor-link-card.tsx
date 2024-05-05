"use client";

import {
  AspectRatio,
  Avatar,
  Card,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";

interface GenericContributorLinkCardProps {
  name: string;
  link: string;
  image: string;
}

export const GenericContributorLinkCard = ({
  name,
  image,
  link,
}: GenericContributorLinkCardProps) => {
  const { colorScheme } = useMantineColorScheme();
  return (
    <AspectRatio ratio={1}>
      <Card
        component="a"
        href={link}
        target="_blank"
        bg={colorScheme === "dark" ? "dark.5" : "gray.1"}
        w={100}
      >
        <Stack align="center">
          <Avatar src={image} alt={name} size={40} display="block" />
          <Text lineClamp={1} size="sm">
            {name}
          </Text>
        </Stack>
      </Card>
    </AspectRatio>
  );
};
