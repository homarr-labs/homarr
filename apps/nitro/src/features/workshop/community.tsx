import { useState } from "react";
import { Alert, Stack } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { WorkshopVoteControlView } from "../../../../../packages/ui/src/source-views/assistant-workshop/vote-control-view";
import { WorkshopReportFormView } from "../../../../../packages/ui/src/source-views/assistant-workshop/report-form-view";
import type { WorkshopReportCategory } from "../../../../../packages/ui/src/source-views/assistant-workshop/contracts";

export function WorkshopVoteControl({
  submissionId,
  score,
  size,
}: {
  submissionId: string;
  score: number;
  size?: "sm" | "md";
}) {
  const t = useI18n("workshop");
  return (
    <WorkshopVoteControlView
      key={submissionId}
      score={score}
      ownVote={null}
      canVote={false}
      pending={false}
      pendingDirection={null}
      size={size}
      upvoteLabel={t("upvote")}
      downvoteLabel={t("downvote")}
      scoreLabel={t("score", { count: score })}
      signInHint="Voting and your recorded vote are unavailable until the Workshop account and provider interaction lifecycle are joined."
      onCastVote={() => {
        throw new Error("Workshop provider votes are held");
      }}
    />
  );
}

export function WorkshopReportForm({
  submissionId,
  opened,
  onClose,
}: {
  submissionId: string;
  opened: boolean;
  onClose(): void;
}) {
  return <ReportDraft key={submissionId} opened={opened} onClose={onClose} />;
}

function ReportDraft({ opened, onClose }: { opened: boolean; onClose(): void }) {
  const t = useI18n("workshop");
  const common = useI18n("common");
  const [category, setCategory] = useState<WorkshopReportCategory>("other");
  const [explanation, setExplanation] = useState("");
  const close = () => {
    setCategory("other");
    setExplanation("");
    onClose();
  };
  return (
    <Stack gap="xs">
      {opened && (
        <Alert color="yellow">
          Report submission is unavailable. This form is the original report presentation; no provider report is sent.
        </Alert>
      )}
      <fieldset disabled style={{ border: 0, margin: 0, padding: 0 }}>
        <WorkshopReportFormView
          opened={opened}
          category={category}
          explanation={explanation}
          error={null}
          pending={false}
          title={t("reportTitle")}
          explanationLabel={t("reportExplanation")}
          reasonLabel={t("reportReason")}
          categoryLabels={{
            outdated: t("reportCategory.outdated"),
            malicious: t("reportCategory.malicious"),
            spam: t("reportCategory.spam"),
            copyright: t("reportCategory.copyright"),
            inappropriate: t("reportCategory.inappropriate"),
            other: t("reportCategory.other"),
          }}
          closeLabel={common("action.close")}
          cancelLabel={common("action.cancel")}
          sendLabel={t("reportSend")}
          onCategoryChange={setCategory}
          onExplanationChange={setExplanation}
          onClose={close}
          onSubmit={() => {
            throw new Error("Workshop provider reports are held");
          }}
        />
      </fieldset>
    </Stack>
  );
}
