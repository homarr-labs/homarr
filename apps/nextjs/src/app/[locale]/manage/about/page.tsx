import { headers } from "next/headers";
import Image from "next/image";
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  AspectRatio,
  Avatar,
  Card,
  Center,
  Flex,
  Group,
  List,
  ListItem,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconLanguage, IconLibrary, IconUsers } from "@tabler/icons-react";

import { getScopedI18n } from "@homarr/translation/server";

import { homarrLogoPath } from "~/components/layout/logo/homarr-logo";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { createMetaTitle } from "~/metadata";
import { getPackageAttributesAsync } from "~/versions/package-reader";
import type githubContributorsJson from "../../../../../../../static-data/contributors.json";
import type crowdinContributorsJson from "../../../../../../../static-data/translators.json";
import classes from "./about.module.css";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

const getHost = () => {
  if (process.env.HOSTNAME) {
    return `${process.env.HOSTNAME}:3000`;
  }

  return headers().get("host");
};

export default async function AboutPage() {
  const baseServerUrl = `http://${getHost()}`;
  const t = await getScopedI18n("management.page.about");
  const attributes = await getPackageAttributesAsync();
  const githubContributors = (await fetch(`${baseServerUrl}/api/about/contributors/github`).then((res) =>
    res.json(),
  )) as typeof githubContributorsJson;

  const crowdinContributors = (await fetch(`${baseServerUrl}/api/about/contributors/crowdin`).then((res) =>
    res.json(),
  )) as typeof crowdinContributorsJson;

  return (
    <div>
      <DynamicBreadcrumb />
      <Center w="100%">
        <Group py="lg">
          <Image src={homarrLogoPath} width={100} height={100} alt="" />
          <Stack gap={0}>
            <Title order={1} tt="uppercase">
              Homarr
            </Title>
            <Title order={2}>{t("version", { version: attributes.version })}</Title>
          </Stack>
        </Group>
      </Center>
      <Text mb="xl">{t("text")}</Text>

      <Accordion defaultValue="contributors" variant="filled" radius="md">
        <AccordionItem value="contributors">
          <AccordionControl icon={<IconUsers size="1rem" />}>
            <Stack gap={0}>
              <Text>{t("accordion.contributors.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("accordion.contributors.subtitle", {
                  count: githubContributors.length,
                })}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <Flex wrap="wrap" gap="xs">
              {githubContributors.map((contributor) => (
                <GenericContributorLinkCard
                  key={contributor.login}
                  link={`https://github.com/${contributor.login}`}
                  image={contributor.avatar_url}
                  name={contributor.login}
                />
              ))}
            </Flex>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="translators">
          <AccordionControl icon={<IconLanguage size="1rem" />}>
            <Stack gap={0}>
              <Text>{t("accordion.translators.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("accordion.translators.subtitle", {
                  count: crowdinContributors.length,
                })}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <Flex wrap="wrap" gap="xs">
              {crowdinContributors.map((translator) => (
                <GenericContributorLinkCard
                  key={translator.username}
                  link={`https://crowdin.com/profile/${translator.username}`}
                  image={translator.avatarUrl}
                  name={translator.username}
                />
              ))}
            </Flex>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="libraries">
          <AccordionControl icon={<IconLibrary size="1rem" />}>
            <Stack gap={0}>
              <Text>{t("accordion.libraries.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("accordion.libraries.subtitle", {
                  count: Object.keys(attributes.dependencies).length,
                })}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <List>
              {Object.entries(attributes.dependencies)
                .sort(([key1], [key2]) => key1.localeCompare(key2))
                .map(([key, value]) => (
                  <ListItem key={key}>
                    {value.includes("workspace:") ? (
                      <Text>{key}</Text>
                    ) : (
                      <a href={`https://www.npmjs.com/package/${key}`}>{key}</a>
                    )}
                  </ListItem>
                ))}
            </List>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

interface GenericContributorLinkCardProps {
  name: string;
  link: string;
  image: string;
}

const GenericContributorLinkCard = ({ name, image, link }: GenericContributorLinkCardProps) => {
  return (
    <AspectRatio ratio={1}>
      <Card className={classes.contributorCard} component="a" href={link} target="_blank" w={100}>
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
