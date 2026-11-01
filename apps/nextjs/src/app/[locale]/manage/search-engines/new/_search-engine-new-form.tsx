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

import { SearchEngineForm } from "../_form";

export const SearchEngineNewForm = ({
  integrations,
}: {
  integrations: RouterOutputs["integration"]["allThatSupportSearch"];
}) => {
  const t = useI18n("search.engine.page.create.notification");
  const router = useRouter();

  const { mutate, isPending } = clientApi.searchEngine.create.useMutation({
    onSuccess: async () => {
      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });
      await revalidatePathActionAsync("/manage/search-engines");
      router.push("/manage/search-engines");
    },
    onError: () => {
      showErrorNotification({
        title: t("error.title"),
        message: t("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof searchEngineManageSchema>) => {
      mutate(values);
    },
    [mutate],
  );

  const submitButtonTranslation = useCallback((t: ScopedTranslationFunction<"common">) => t("action.create"), []);

  return (
    <SearchEngineForm
      integrations={integrations}
      submitButtonTranslation={submitButtonTranslation}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
