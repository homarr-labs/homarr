"use client";

import { Button, Group, Rating, Stack, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";

import { createModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

interface WidgetFeedbackModalProps {
  itemId: string;
  widgetKind: string;
}

export const WidgetFeedbackModal = createModal<WidgetFeedbackModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const tFeedback = useScopedI18n("feedback");
  const [usabilityRating, setUsabilityRating] = useState(0);
  const [featuresRating, setFeaturesRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [discordUsername, setDiscordUsername] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = usabilityRating > 0 && featuresRating > 0 && overallRating > 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (typeof window !== "undefined" && window.umami) {
        window.umami.track("widget-feedback", {
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
        title: tFeedback("notification.success.title"),
        message: tFeedback("notification.success.message"),
      });

      actions.closeModal();
    } catch (error) {
      console.error("Error sending feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack>
      <Stack gap="xs">
        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="usability-rating">{tFeedback("rating.usability.label")}</label>
            <Rating id="usability-rating" value={usabilityRating} onChange={setUsabilityRating} size="lg" />
          </Stack>
        </Group>

        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="features-rating">{tFeedback("rating.features.label")}</label>
            <Rating id="features-rating" value={featuresRating} onChange={setFeaturesRating} size="lg" />
          </Stack>
        </Group>

        <Group>
          <Stack gap={5} style={{ flex: 1 }}>
            <label htmlFor="overall-rating">{tFeedback("rating.overall.label")}</label>
            <Rating id="overall-rating" value={overallRating} onChange={setOverallRating} size="lg" />
          </Stack>
        </Group>
      </Stack>

      <TextInput
        label={tFeedback("discord.label")}
        placeholder={tFeedback("discord.placeholder")}
        description={tFeedback("discord.description")}
        value={discordUsername}
        onChange={(e) => setDiscordUsername(e.currentTarget.value)}
      />

      <Textarea
        label={tFeedback("comments.label")}
        placeholder={tFeedback("comments.placeholder")}
        minRows={4}
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.currentTarget.value)}
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={() => actions.closeModal()}>
          {t("common.action.cancel")}
        </Button>
        <Button loading={isSubmitting} onClick={handleSubmit} disabled={!isFormValid}>
          {tFeedback("button.submit")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("feedback.modal.title"),
});
