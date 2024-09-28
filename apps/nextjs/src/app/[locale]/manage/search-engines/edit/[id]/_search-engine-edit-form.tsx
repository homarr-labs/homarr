"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import type { validation, z } from "@homarr/validation";

import { SearchEngineForm } from "../../_form";

interface SearchEngineEditFormProps {
  searchEngine: RouterOutputs["searchEngine"]["byId"];
}

export const SearchEngineEditForm = ({ searchEngine }: SearchEngineEditFormProps) => {
  const t = useScopedI18n("search.engine.page.edit.notification");
  const router = useRouter();

  const { mutate, isPending } = clientApi.searchEngine.update.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });
      void revalidatePathActionAsync("/manage/search-engines").then(() => {
        router.push("/manage/search-engines");
      });
    },
    onError: () => {
      showErrorNotification({
        title: t("error.title"),
        message: t("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof validation.searchEngine.manage>) => {
      mutate({
        id: searchEngine.id,
        ...values,
      });
    },
    [mutate, searchEngine.id],
  );

  const submitButtonTranslation = useCallback((t: TranslationFunction) => t("common.action.save"), []);

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
