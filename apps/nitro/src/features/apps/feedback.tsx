import { Alert, Button, Stack } from "@mantine/core";
import { ORPCError } from "@orpc/client";

import { useI18n } from "@homarr/translation/standalone/client";

import { useAppsFeature } from "./context";

export function AppsRequestError({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useI18n("common");
  const { unavailable } = useAppsFeature();
  const message =
    error instanceof ORPCError
      ? error.code === "UNAUTHORIZED"
        ? unavailable.authentication
        : error.code === "FORBIDDEN"
          ? unavailable.permission
          : unavailable.resource
      : unavailable.resource;
  return (
    <Alert color="red" role="alert">
      <Stack gap="xs">
        {message}
        {retry && (
          <Button variant="default" onClick={retry}>
            {t("action.tryAgain")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function AppsAccessNotice({ action }: { action: "browse" | "create" | "edit" | "select" }) {
  const feature = useAppsFeature();
  if (feature.principal.kind === "anonymous") return <Alert>{feature.unavailable.authentication}</Alert>;
  const allowed =
    action === "browse"
      ? feature.canAccess
      : action === "create"
        ? feature.canCreate
        : action === "edit"
          ? feature.canManageAll
          : true;
  if (!allowed) return <Alert>{feature.unavailable.permission}</Alert>;
  return null;
}
