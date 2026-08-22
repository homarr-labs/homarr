import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { objectKeys } from "@homarr/common";
import type { GroupPermissionKey } from "@homarr/definitions";
import { groupPermissions } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";

import type { PermissionLabels } from "./_group-permission-form";
import {
  EffectivePermissionPreview,
  PermissionForm,
  PermissionMatrix,
  PresetButtons,
  SaveAffix,
} from "./_group-permission-form";

interface GroupPermissionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GroupPermissionsPage(props: GroupPermissionsPageProps) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const group = await api.group.getById({ id: params.id });
  const tPermissionsPage = await getI18n("management.page.group.setting.permissions");

  const { permissionLabels, permissionDescriptions } = await buildPermissionTextsAsync();

  return (
    <Stack>
      <Title>{tPermissionsPage("title")}</Title>

      <PermissionForm initialPermissions={group.permissions}>
        <Stack pos="relative">
          <PresetButtons />

          <PermissionMatrix permissionLabels={permissionLabels} permissionDescriptions={permissionDescriptions} />

          <EffectivePermissionPreview permissionLabels={permissionLabels} />

          <SaveAffix groupId={group.id} />
        </Stack>
      </PermissionForm>
    </Stack>
  );
}

const buildPermissionTextsAsync = async () => {
  const permissionLabels: PermissionLabels = {};
  const permissionDescriptions: PermissionLabels = {};

  for (const category of objectKeys(groupPermissions)) {
    const tItem = await getI18n(`group.permission.${category}.item`);
    const item = groupPermissions[category];
    const suffixes = typeof item !== "boolean" ? item : (["admin"] as const);

    suffixes.forEach((suffix) => {
      const key = (typeof item !== "boolean" ? `${category}-${suffix}` : "admin") as GroupPermissionKey;
      permissionLabels[key] = tItem(`${suffix}.label`);
      permissionDescriptions[key] = tItem(`${suffix}.description`);
    });
  }

  return { permissionLabels, permissionDescriptions };
};
