"use client";

import { Accordion, Anchor, Button, Center, Flex, Group, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import dynamic from "next/dynamic";

import { clientApi } from "@homarr/api/client";
import type { RouterOutputs } from "@homarr/api";
import { SAFE_NEW_TAB_REL } from "@homarr/common";
import { createModal, modalSizeSelect } from "@homarr/modals";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

const Markdown = dynamic(() => import("@homarr/ui/markdown").then((module) => module.Markdown));

const releasesUrl = "https://github.com/homarr-labs/homarr/releases";
const titleLinePattern = /^#\s+(.+)\r?\n+/;

export const whatsNewQueryOptions = {
  staleTime: 60 * 60 * 1_000,
  refetchOnWindowFocus: false,
  retry: false,
} as const;

type WhatsNewRelease = RouterOutputs["updateChecker"]["getWhatsNew"]["releases"][number];

const splitTitle = (release: WhatsNewRelease) => {
  const match = titleLinePattern.exec(release.body);
  if (!match?.[1]) return { title: release.name ?? release.tagName, body: release.body };
  return { title: match[1].trim(), body: release.body.slice(match[0].length) };
};

interface WhatsNewModalProps {
  scope: "unseen" | "recent";
}

interface WhatsNewContentProps extends WhatsNewModalProps {
  onDismiss: () => void;
}

const WhatsNewContent = ({ scope, onDismiss }: WhatsNewContentProps) => {
  const t = useI18n("whatsNew");
  const locale = useCurrentIntlLocale();
  const { data, isPending } = clientApi.updateChecker.getWhatsNew.useQuery({ scope }, whatsNewQueryOptions);

  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const releases = data?.releases ?? [];
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <Stack gap="md">
      {releases.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {t("empty")}
        </Text>
      )}
      {releases.length > 0 && (
        <ScrollArea.Autosize mah="calc(100dvh - 14rem)" type="auto" scrollbars="y" offsetScrollbars="present">
          <Accordion order={3} keepMounted={false} defaultValue={releases[0]?.tagName}>
            {releases.map((release) => {
              const { title, body } = splitTitle(release);
              return (
                <Accordion.Item key={release.tagName} value={release.tagName}>
                  <Accordion.Control>
                    <Flex component="span" justify="space-between" align="center" gap="md" wrap="nowrap">
                      <Text component="span" fw={600}>
                        {title}
                      </Text>
                      <Text component="span" size="sm" c="dimmed">
                        {dateFormat.format(release.publishedAt)}
                      </Text>
                    </Flex>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Markdown allowHtml githubMentions>
                      {body}
                    </Markdown>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </ScrollArea.Autosize>
      )}
      <Group justify="space-between">
        <Anchor href={releasesUrl} target="_blank" rel={SAFE_NEW_TAB_REL} size="sm">
          <Group component="span" gap={4} wrap="nowrap">
            {t("allReleases")}
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
        <Button onClick={onDismiss}>{t("dismiss")}</Button>
      </Group>
    </Stack>
  );
};

export const WhatsNewModal = createModal<WhatsNewModalProps>(({ actions, innerProps }) => (
  <WhatsNewContent scope={innerProps.scope} onDismiss={actions.closeModal} />
)).withOptions({
  defaultTitle: (t) => t("whatsNew.title"),
  size: modalSizeSelect,
});
