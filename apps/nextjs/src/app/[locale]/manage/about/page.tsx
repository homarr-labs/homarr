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
  Kbd,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconKeyboard,
  IconLanguage,
  IconLibrary,
  IconMoneybagHeart,
  IconPackage,
  IconUsers,
} from "@tabler/icons-react";

import { capitalize, objectEntries } from "@homarr/common";
import { hotkeys } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";

import { homarrLogoPath } from "~/components/layout/logo/homarr-logo";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { createMetaTitle } from "~/metadata";
import type { PackageJsonDependencies } from "~/versions/package-reader";
import { getPackageVersion } from "~/versions/package-reader";
import type githubContributorsJson from "../../../../../../../static-data/contributors.json";
import type openCollectiveContributorsJson from "../../../../../../../static-data/opencollective-contributors.json";
import type crowdinContributorsJson from "../../../../../../../static-data/translators.json";
import classes from "./about.module.css";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

const getHostAsync = async () => {
  if (process.env.HOSTNAME) {
    return `${process.env.HOSTNAME}:3000`;
  }

  return (await headers()).get("host");
};

export default async function AboutPage() {
  const baseServerUrl = `http://${await getHostAsync()}`;
  const t = await getScopedI18n("management.page.about");
  const version = getPackageVersion();
  const dependencies = (await fetch(`${baseServerUrl}/api/about/dependencies`).then((res) =>
    res.json(),
  )) as PackageJsonDependencies;
  const githubContributors = (await fetch(`${baseServerUrl}/api/about/contributors/github`).then((res) =>
    res.json(),
  )) as typeof githubContributorsJson;

  const crowdinContributors = (await fetch(`${baseServerUrl}/api/about/contributors/crowdin`).then((res) =>
    res.json(),
  )) as typeof crowdinContributorsJson;

  const openCollectiveContributors = (await fetch(`${baseServerUrl}/api/about/contributors/opencollective`).then(
    (res) => res.json(),
  )) as typeof openCollectiveContributorsJson;

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
            <Title order={2}>{t("version", { version })}</Title>
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
                  count: String(githubContributors.length),
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
                  count: String(crowdinContributors.length),
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
        <AccordionItem value="sponsors">
          <AccordionControl icon={<IconMoneybagHeart size="1rem" />}>
            <Stack gap={0}>
              <Text>{t("accordion.sponsors.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("accordion.sponsors.subtitle", {
                  count: String(openCollectiveContributors.length),
                })}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <Flex wrap="wrap" gap="xs">
              {openCollectiveContributors.map((sponsor) => (
                <GenericContributorLinkCard
                  key={sponsor.slug}
                  link={`https://opencollective.com/${sponsor.slug}`}
                  image={sponsor.imageUrl}
                  name={sponsor.name}
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
                  count: String(Object.keys(dependencies).length),
                })}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <SimpleGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
              {Object.entries(dependencies)
                .filter(([, value]) => !value.includes("workspace:"))
                .sort(([key1], [key2]) => key1.localeCompare(key2))
                .map(([name, version]) => (
                  <UnstyledButton
                    key={name}
                    component="a"
                    href={`https://www.npmjs.com/package/${name}`}
                    target="_blank"
                  >
                    <Card withBorder radius="md" p="xs" className={classes.dependencyCard}>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon variant="light" size="lg" radius="md">
                          <IconPackage size="1.5rem" stroke={1.5} />
                        </ThemeIcon>

                        <Stack gap={0}>
                          <Text size="sm" fw="bold" lineClamp={1} title={name}>
                            {name}
                          </Text>
                          <Text size="sm" c="dimmed">
                            v{version.replace("^", "").replace("~", "")}
                          </Text>
                        </Stack>
                      </Group>
                    </Card>
                  </UnstyledButton>
                ))}
            </SimpleGrid>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="hotkeys">
          <AccordionControl icon={<IconKeyboard size="1rem" />}>
            <Stack gap={0}>
              <Text>{t("accordion.hotkeys.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("accordion.hotkeys.subtitle")}
              </Text>
            </Stack>
          </AccordionControl>
          <AccordionPanel>
            <Table>
              <TableThead>
                <TableTr>
                  <TableTh>{t("accordion.hotkeys.field.shortcut")}</TableTh>
                  <TableTh>{t("accordion.hotkeys.field.action")}</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {objectEntries(hotkeys).map(([key, shortcut]) => (
                  <TableTr key={key}>
                    <TableTd>
                      <Kbd size="md">
                        {shortcut
                          .split("+")
                          .map((key) => capitalize(key.trim()))
                          .join(" + ")}
                      </Kbd>
                    </TableTd>
                    <TableTd>{t(`accordion.hotkeys.action.${key}`)}</TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>

            <Text size="sm" c="dimmed">
              {t("accordion.hotkeys.note")}
            </Text>
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
