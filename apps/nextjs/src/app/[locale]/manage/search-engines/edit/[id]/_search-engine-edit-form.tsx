"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { searchEngineManageSchema } from "@homarr/validation/search-engine";

import { SearchEngineForm } from "../../_form";

interface SearchEngineEditFormProps {
  searchEngine: RouterOutputs["searchEngine"]["byId"];
}

export const SearchEngineEditForm = ({ searchEngine }: SearchEngineEditFormProps) => {
  const t = useI18n("search.engine.page.edit.notification");
  const tCommon = useI18n("common");
  const router = useRouter();

  const { mutate, isPending } = clientApi.searchEngine.update.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: tCommon("notification.update.success"),
        message: t("success.message"),
      });
      void revalidatePathActionAsync("/manage/search-engines").then(() => {
        router.push("/manage/search-engines");
      });
    },
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.update.error"),
        message: t("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof searchEngineManageSchema>) => {
      mutate({
        id: searchEngine.id,
        ...values,
      });
    },
    [mutate, searchEngine.id],
  );

  const submitButtonTranslation = useCallback((t: ScopedTranslationFunction<"common">) => t("action.save"), []);

  return (
    <SearchEngineForm
      submitButtonTranslation={submitButtonTranslation}
      initialValues={searchEngine}
      handleSubmit={handleSubmit}
      isPending={isPending}
      disableShort
    />
  );
};
