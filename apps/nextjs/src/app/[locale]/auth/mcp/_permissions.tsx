import { List, ListItem, Stack, Text, Title } from "@mantine/core";

import type { GroupPermissionKey } from "@homarr/definitions";
import { getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";

const permissionLabels = {
  "board-create": "board.item.create.label",
  "board-view-all": "board.item.view-all.label",
  "board-modify-all": "board.item.modify-all.label",
  "board-full-all": "board.item.full-all.label",
  "app-create": "app.item.create.label",
  "app-use-all": "app.item.use-all.label",
  "app-modify-all": "app.item.modify-all.label",
  "app-full-all": "app.item.full-all.label",
  "integration-create": "integration.item.create.label",
  "integration-use-all": "integration.item.use-all.label",
  "integration-interact-all": "integration.item.interact-all.label",
  "integration-full-all": "integration.item.full-all.label",
  "search-engine-create": "search-engine.item.create.label",
  "search-engine-modify-all": "search-engine.item.modify-all.label",
  "search-engine-full-all": "search-engine.item.full-all.label",
  "media-upload": "media.item.upload.label",
  "media-view-all": "media.item.view-all.label",
  "media-full-all": "media.item.full-all.label",
  "other-view-logs": "other.item.view-logs.label",
  admin: "admin.item.admin.label",
} as const satisfies Record<GroupPermissionKey, string>;

export const ConsentPermissions = async ({ permissions }: { permissions: GroupPermissionKey[] }) => {
  const [t, tPermissions] = await Promise.all([getI18n("user.page.mcpConsent"), getI18n("group.permission")]);
  const effectivePermissions = new Set(getPermissionsWithChildren(permissions));
  const displayedPermissions = groupPermissionKeys.filter((permission) => effectivePermissions.has(permission));

  return (
    <section aria-labelledby="mcp-access-heading">
      <Stack gap="sm">
        <Title order={2} size="h4" id="mcp-access-heading">
          {t("access.title")}
        </Title>
        <Text size="sm">{t("access.description")}</Text>
        {displayedPermissions.length > 0 ? (
          <List size="sm" spacing="xs" withPadding>
            {displayedPermissions.map((permission) => (
              <ListItem key={permission}>{tPermissions(permissionLabels[permission])}</ListItem>
            ))}
          </List>
        ) : (
          <Text size="sm">{t("access.noGlobalPermissions")}</Text>
        )}
      </Stack>
    </section>
  );
};
