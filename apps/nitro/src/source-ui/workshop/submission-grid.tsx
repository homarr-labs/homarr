import type { ReactNode } from "react";
import type { StyleProp } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { WorkshopSubmissionCardView } from "../../../../../packages/ui/src/source-views/assistant-workshop/submission-card-view";
import { WorkshopSubmissionGridView } from "../../../../../packages/ui/src/source-views/assistant-workshop/submission-grid-view";
import type { WorkshopSubmissionGridViewState } from "../../../../../packages/ui/src/source-views/assistant-workshop/contracts";
import type { WorkshopCardItem, WorkshopGridState } from "./contracts";

export function WorkshopSubmissionGrid({
  state,
  fileUrl,
  ariaLabel,
  emptyState,
  cols,
  renderActions,
}: {
  state: WorkshopGridState;
  fileUrl?(submissionId: string, filename: string, thumb?: string): string;
  ariaLabel: string;
  emptyState: ReactNode;
  cols?: StyleProp<number>;
  renderActions(item: WorkshopCardItem): ReactNode;
}) {
  const t = useI18n("workshop");
  const common = useI18n("common");
  let viewState: WorkshopSubmissionGridViewState;
  if (state.status === "loading") viewState = { status: "loading", source: "query" };
  else if (state.status === "failed") {
    viewState = { status: "failed", retryPending: state.pending, onRetry: state.retry };
  } else if (state.status === "held") viewState = { status: "unavailable", content: state.content };
  else {
    viewState = {
      status: "loaded",
      cards: state.items.map((item) => {
        const screenshot = item.screenshots?.[0];
        let preview = null;
        if (screenshot && fileUrl) {
          preview = {
            url: fileUrl(item.id, screenshot, "600x400"),
            alt: t("screenshotAlt", { title: item.title, count: 1 }),
          };
        }
        return (
          <WorkshopSubmissionCardView
            key={item.id}
            title={item.title}
            type={item.type}
            authorLabel={t("author", { name: item.authorName || t("communityMember") })}
            description={item.description || t("noDescription")}
            outdated={item.outdated}
            reportCount={item.reportCount}
            screenshot={preview}
            outdatedLabel={t("outdated")}
            reportWarningLabel={t("reportWarning", { count: item.reportCount })}
            reportCountLabel={t("reportCount", { count: item.reportCount })}
            actions={renderActions(item)}
          />
        );
      }),
    };
  }
  return (
    <WorkshopSubmissionGridView
      state={viewState}
      ariaLabel={ariaLabel}
      emptyState={emptyState}
      cols={cols}
      unavailableTitle={t("unavailableTitle")}
      unavailableDescription={t("unavailable")}
      retryLabel={common("action.tryAgain")}
    />
  );
}
