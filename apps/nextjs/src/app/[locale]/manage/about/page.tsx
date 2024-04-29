import Image from "next/image";
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Center,
  Group,
  List,
  ListItem,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconLanguage, IconLibrary, IconUsers } from "@tabler/icons-react";
import { setStaticParamsLocale } from "next-international/server";

import { getScopedI18n, getStaticParams } from "@homarr/translation/server";

import { getPackageAttributesAsync } from "~/versions/package-reader";
import logo from "../../../../../public/logo/logo.png";
import classes from "./accordion.module.css";

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function AboutPage({ params: { locale } }: PageProps) {
  setStaticParamsLocale(locale);
  const t = await getScopedI18n("management.page.about");
  const attributes = await getPackageAttributesAsync();
  return (
    <div>
      <Center w="100%">
        <Group py="lg">
          <Image src={logo} width={100} height={100} alt="" />
          <Stack gap={0}>
            <Title order={1} tt="uppercase">
              Homarr
            </Title>
            <Title order={2}>
              {t("version", { version: attributes.version })}
            </Title>
          </Stack>
        </Group>
      </Center>
      <Text mb="xl">{t("text")}</Text>

      <Accordion classNames={classes}>
        <AccordionItem value="contributors">
          <AccordionControl icon={<IconUsers size="1rem" />}>
            {t("accordion.contributors.title")}
          </AccordionControl>
          <AccordionPanel></AccordionPanel>
        </AccordionItem>
        <AccordionItem value="translators">
          <AccordionControl icon={<IconLanguage size="1rem" />}>
            {t("accordion.translators.title")}
          </AccordionControl>
          <AccordionPanel></AccordionPanel>
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

export function generateStaticParams() {
  return getStaticParams();
}

export const dynamic = "force-static";
