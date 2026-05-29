import { useUserPreference } from "../../../../preferences/use-user-preference";
import type { UserPreferenceKey } from "@homarr/settings";
import { useScopedI18n } from "@homarr/translation/client";

import { clientApi } from "@homarr/api/client";

import { createChildrenOptions } from "../../../../lib/children";
import { createLoadingPreferenceAction, PreferenceDetailHeader } from "./action-row";
import { createSelectablePreferenceActions } from "./selectable-actions";

interface BoardChildrenOptionsConfig {
  preferenceKey: Extract<UserPreferenceKey, "homeBoardId" | "mobileHomeBoardId">;
}

const boardDetailTitleKeys = {
  homeBoardId: "homeBoardId.children.detail.title",
  mobileHomeBoardId: "mobileHomeBoardId.children.detail.title",
} as const;

export const createBoardChildrenOptions = (config: BoardChildrenOptionsConfig) =>
  createChildrenOptions<Record<string, unknown>>({
    useActions: (_, query) => {
      const { value, setValue, isPending } = useUserPreference(config.preferenceKey);
      const currentValue = value as string | null;
      const boardsQuery = clientApi.board.getAllBoards.useQuery();
      const t = useScopedI18n("search.mode.command.group.preferences.option");

      if (boardsQuery.isLoading) {
        return [createLoadingPreferenceAction()];
      }

      return createSelectablePreferenceActions({
        query,
        currentValue,
        noneLabel: t("board.none"),
        unavailableLabel: t("board.unavailable"),
        items: (boardsQuery.data ?? []).map((board) => ({
          key: board.id,
          label: board.name,
          value: board.id,
        })),
        onSelect: (nextValue) => setValue(nextValue as never),
        isPending,
      });
    },
    DetailComponent: () => <PreferenceDetailHeader titleKey={boardDetailTitleKeys[config.preferenceKey]} />,
  });
