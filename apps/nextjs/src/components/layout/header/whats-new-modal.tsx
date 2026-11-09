"use client";

import { Accordion, Anchor, Button, Center, Flex, Group, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { SAFE_NEW_TAB_REL } from "@homarr/common";
import { createModal, modalSizeSelect } from "@homarr/modals";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { Markdown } from "@homarr/ui/markdown";

const releasesUrl = "https://github.com/homarr-labs/homarr/releases";

export const whatsNewQueryOptions = {
  staleTime: 60 * 60 * 1_000,
  refetchOnWindowFocus: false,
  retry: false,
} as const;

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
      {releases.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("empty")}
        </Text>
      ) : (
        <ScrollArea.Autosize mah="60dvh" type="auto" scrollbars="y" offsetScrollbars="present">
          <Accordion variant="separated" order={3} keepMounted={false} defaultValue={releases[0]?.tagName}>
            {releases.map((release) => (
              <Accordion.Item key={release.tagName} value={release.tagName}>
                <Accordion.Control>
                  <Flex component="span" justify="space-between" align="center" gap="md" wrap="nowrap">
                    <Text component="span" fw={600}>
                      {release.name ?? release.tagName}
                    </Text>
                    <Text component="span" size="sm" c="dimmed">
                      {dateFormat.format(release.publishedAt)}
                    </Text>
                  </Flex>
                </Accordion.Control>
                <Accordion.Panel>
                  <Markdown allowHtml githubMentions>
                    {release.body}
                  </Markdown>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </ScrollArea.Autosize>
      )}
      <Group justify="space-between">
        <Anchor href={releasesUrl} target="_blank" rel={SAFE_NEW_TAB_REL} size="sm">
          {t("allReleases")}
          <IconExternalLink size={14} style={{ marginInlineStart: 4, verticalAlign: "middle" }} />
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
