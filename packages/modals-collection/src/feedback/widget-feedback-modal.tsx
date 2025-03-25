"use client";

import { useState } from "react";
import { Button, Group, Rating, Stack, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { createModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

interface WidgetFeedbackModalProps {
  itemId: string;
  widgetKind: string;
}

export const WidgetFeedbackModal = createModal<WidgetFeedbackModalProps>(({ actions, innerProps }) => {
  const tCommon = useI18n();
  const t = useScopedI18n("feedback");
  const [usabilityRating, setUsabilityRating] = useState(0);
  const [featuresRating, setFeaturesRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [discordUsername, setDiscordUsername] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, handle] = useDisclosure(false);

  const isFormValid = usabilityRating > 0 && featuresRating > 0 && overallRating > 0;

  const handleSubmit = () => {
    handle.open();

    try {
      if (typeof window !== "undefined") {
        umami.track("widget-feedback", {
          itemId: innerProps.itemId,
          widgetKind: innerProps.widgetKind,
          usabilityRating,
          featuresRating,
          overallRating,
          discordUsername: discordUsername || "anonymous",
          feedbackText,
        });
      }

      showSuccessNotification({
        title: t("notification.success.title"),
        message: t("notification.success.message"),
      });

      actions.closeModal();
    } catch (error) {
      console.error("Error sending feedback:", error);
    } finally {
      handle.close();
    }
  };

  return (
    <Stack>
      <Stack gap="xs">
        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="usability-rating">{t("rating.usability.label")}</label>
            <Rating id="usability-rating" value={usabilityRating} onChange={setUsabilityRating} size="lg" />
          </Stack>
        </Group>

        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="features-rating">{t("rating.features.label")}</label>
            <Rating id="features-rating" value={featuresRating} onChange={setFeaturesRating} size="lg" />
          </Stack>
        </Group>

        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="overall-rating">{t("rating.overall.label")}</label>
            <Rating id="overall-rating" value={overallRating} onChange={setOverallRating} size="lg" />
          </Stack>
        </Group>
      </Stack>

      <TextInput
        label={t("discord.label")}
        placeholder={t("discord.placeholder")}
        description={t("discord.description")}
        value={discordUsername}
        onChange={(event) => setDiscordUsername(event.currentTarget.value)}
      />

      <Textarea
        label={t("comments.label")}
        placeholder={t("comments.placeholder")}
        minRows={4}
        value={feedbackText}
        onChange={(event) => setFeedbackText(event.currentTarget.value)}
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={() => actions.closeModal()}>
          {tCommon("common.action.cancel")}
        </Button>
        <Button loading={submitting} onClick={handleSubmit} disabled={!isFormValid}>
          {t("button.submit")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("feedback.modal.title"),
});
