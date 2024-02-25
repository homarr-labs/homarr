import type { PropsWithChildren } from "react";

import { capitalize } from "@homarr/common";
import type { TranslationObject } from "@homarr/translation";
import { getScopedI18n } from "@homarr/translation/server";
import type { TablerIconsProps } from "@homarr/ui";
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  IconAlertTriangle,
  IconBrush,
  IconLayout,
  IconPhoto,
  IconSettings,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { BackgroundSettingsContent } from "./_background";
import { ColorSettingsContent } from "./_colors";
import { DangerZoneSettingsContent } from "./_danger";
import { GeneralSettingsContent } from "./_general";
import { LayoutSettingsContent } from "./_layout";

interface Props {
  params: {
    name: string;
  };
}

export default async function BoardSettingsPage({ params }: Props) {
  const board = await api.board.byName({ name: params.name });
  const t = await getScopedI18n("board.setting");

  return (
    <Container>
      <Stack>
        <Title>{t("title", { boardName: capitalize(board.name) })}</Title>
        <Accordion variant="separated" defaultValue="general">
          <AccordionItemFor value="general" icon={IconSettings}>
            <GeneralSettingsContent board={board} />
          </AccordionItemFor>
          <AccordionItemFor value="layout" icon={IconLayout}>
            <LayoutSettingsContent board={board} />
          </AccordionItemFor>
          <AccordionItemFor value="background" icon={IconPhoto}>
            <BackgroundSettingsContent board={board} />
          </AccordionItemFor>
          <AccordionItemFor value="color" icon={IconBrush}>
            <ColorSettingsContent board={board} />
          </AccordionItemFor>
          <AccordionItemFor
            value="dangerZone"
            icon={IconAlertTriangle}
            danger
            noPadding
          >
            <DangerZoneSettingsContent board={board} />
          </AccordionItemFor>
        </Accordion>
      </Stack>
    </Container>
  );
}

type AccordionItemForProps = PropsWithChildren<{
  value: keyof TranslationObject["board"]["setting"]["section"];
  icon: (props: TablerIconsProps) => JSX.Element;
  danger?: boolean;
  noPadding?: boolean;
}>;

const AccordionItemFor = async ({
  value,
  children,
  icon: Icon,
  danger,
  noPadding,
}: AccordionItemForProps) => {
  const t = await getScopedI18n("board.setting.section");
  return (
    <AccordionItem
      value={value}
      styles={
        danger
          ? {
              item: {
                "--__item-border-color": "rgba(248,81,73,0.4)",
                borderWidth: 4,
              },
            }
          : undefined
      }
    >
      <AccordionControl icon={<Icon />}>
        <Text fw="bold" size="lg">
          {t(`${value}.title`)}
        </Text>
      </AccordionControl>
      <AccordionPanel
        styles={
          noPadding
            ? { content: { paddingRight: 0, paddingLeft: 0 } }
            : undefined
        }
      >
        {children}
      </AccordionPanel>
    </AccordionItem>
  );
};
