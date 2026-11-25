"use client";

import { useCallback } from "react";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useSettings } from "@homarr/settings";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { AppForm } from "@homarr/forms-collection";
import type { appManageSchema } from "@homarr/validation/app";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { addInPlaceActions, getAddInPlaceState, useAddInPlaceSession } from "./store";

export const useCreateAppAndPlace = () => {
  const { data: session } = useSession();
  const canCreateApp = session?.user.permissions.includes("app-create") ?? false;
  const tCommon = useI18n("common");
  const tScoped = useI18n("app.page.create.notification");
  const settings = useSettings();
  const utils = clientApi.useUtils();
  const { mutateAsync, isPending } = clientApi.app.create.useMutation({
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.create.error"),
        message: tScoped("error.message"),
      });
    },
  });

  const submit = useCallback(
    async (values: z.infer<typeof appManageSchema>) => {
      if (!canCreateApp) return;
      const origin = getAddInPlaceState();
      const attempt = origin.session?.createAppAttempt;
      if (origin.step !== "createApp" || !attempt) return;
      const created = await mutateAsync(values).catch(() => null);
      if (!created) return;
      void utils.app.invalidate();
      const definition = await loadWidgetDefinition("app");
      const current = getAddInPlaceState();
      if (current.step !== "createApp" || current.session?.createAppAttempt !== attempt) return;
      const options = { ...reduceWidgetOptionsWithDefinition(definition, settings), appId: created.appId };
      addInPlaceActions.pick({ type: "app", appId: created.appId, name: values.name });
      addInPlaceActions.commit({
        options,
        integrationIds: [],
        advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
      });
    },
    [canCreateApp, mutateAsync, settings, utils],
  );

  return { submit, isPending, canCreateApp };
};

export const CreateAppForm = () => {
  const tCommon = useI18n("common");
  const session = useAddInPlaceSession();
  const { submit, isPending, canCreateApp } = useCreateAppAndPlace();
  const initialValues = session?.createAppName
    ? { name: session.createAppName, description: "", iconUrl: "", href: "", pingUrl: "" }
    : undefined;

  if (!canCreateApp) return null;

  return (
    <AppForm
      initialValues={initialValues}
      showBackToOverview={false}
      buttonLabels={{ submit: tCommon("action.create") }}
      isPending={isPending}
      handleSubmit={(values) => submit(values)}
    />
  );
};
