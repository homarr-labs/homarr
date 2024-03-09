import { notFound } from "next/navigation";

import { getScopedI18n } from "@homarr/translation/server";
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Avatar,
  Group,
  IconAlertTriangleFilled,
  IconSettingsFilled,
  IconShieldLockFilled,
  IconUserFilled,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { DangerZoneAccordion } from "./_components/dangerZone.accordion";
import { ProfileAccordion } from "./_components/profile.accordion";
import { SecurityAccordionComponent } from "./_components/security.accordion";

interface Props {
  params: {
    userId: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const user = await api.user.getById({
    userId: params.userId,
  });
  const t = await getScopedI18n("management.page.user.edit");
  const metaTitle = `${t("metaTitle", { username: user?.name })} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function EditUserPage({ params }: Props) {
  const t = await getScopedI18n("management.page.user.edit");
  const user = await api.user.getById({
    userId: params.userId,
  });

  if (!user) {
    notFound();
  }

  return (
    <Stack>
      <Group mb="md">
        <Avatar>{user.name?.substring(0, 2)}</Avatar>
        <Title>{user.name}</Title>
      </Group>
      <Accordion variant="separated" defaultValue="general">
        <AccordionItem value="general">
          <AccordionControl icon={<IconUserFilled />}>
            <Text fw="bold" size="lg">
              {t("section.profile.title")}
            </Text>
          </AccordionControl>
          <AccordionPanel>
            <ProfileAccordion user={user} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="preferences">
          <AccordionControl icon={<IconSettingsFilled />}>
            <Text fw="bold" size="lg">
              {t("section.preferences.title")}
            </Text>
          </AccordionControl>
          <AccordionPanel></AccordionPanel>
        </AccordionItem>
        <AccordionItem value="security">
          <AccordionControl icon={<IconShieldLockFilled />}>
            <Text fw="bold" size="lg">
              {t("section.security.title")}
            </Text>
          </AccordionControl>
          <AccordionPanel>
            <SecurityAccordionComponent user={user} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem
          styles={{
            item: {
              borderColor: "rgba(248,81,73,0.4)",
              borderWidth: 4,
            },
          }}
          value="dangerZone"
        >
          <AccordionControl icon={<IconAlertTriangleFilled />}>
            <Text fw="bold" size="lg">
              {t("section.dangerZone.title")}
            </Text>
          </AccordionControl>
          <AccordionPanel
            styles={{ content: { paddingRight: 0, paddingLeft: 0 } }}
          >
            <DangerZoneAccordion user={user} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  );
}
