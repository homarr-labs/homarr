import type { PropsWithChildren } from "react";

import { capitalize } from "@homarr/common";
import type { TranslationObject } from "@homarr/translation";
import { getScopedI18n } from "@homarr/translation/server";
import type { TablerIconsProps } from "@homarr/ui";
import {
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  IconAlertTriangle,
  IconBrush,
  IconFileTypeCss,
  IconLayout,
  IconPhoto,
  IconSettings,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { ActiveTabAccordion } from "../../../../../components/active-tab-accordion";
import { BackgroundSettingsContent } from "./_background";
import { ColorSettingsContent } from "./_colors";
import { CustomCssSettingsContent } from "./_customCss";
import { DangerZoneSettingsContent } from "./_danger";
import { GeneralSettingsContent } from "./_general";
import { LayoutSettingsContent } from "./_layout";

interface Props {
  params: {
    name: string;
  };
  searchParams: {
    tab?: keyof TranslationObject["board"]["setting"]["section"];
  };
}

export default async function BoardSettingsPage({
  params,
  searchParams,
}: Props) {
  const board = await api.board.byName({ name: params.name });
  const t = await getScopedI18n("board.setting");

  return (
    <Container>
      <Stack>
        <Title>{t("title", { boardName: capitalize(board.name) })}</Title>
        <ActiveTabAccordion
          variant="separated"
          defaultValue={searchParams.tab ?? "general"}
        >
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
          <AccordionItemFor value="customCss" icon={IconFileTypeCss}>
            <CustomCssSettingsContent />
          </AccordionItemFor>
          <AccordionItemFor
            value="dangerZone"
            icon={IconAlertTriangle}
            danger
            noPadding
          >
            <DangerZoneSettingsContent />
          </AccordionItemFor>
        </ActiveTabAccordion>
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
