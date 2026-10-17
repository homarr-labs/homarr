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

  const [group, tPermissionsPage, { permissionLabels, permissionDescriptions }] = await Promise.all([
    api.group.getById({ id: params.id }),
    getI18n("management.page.group.setting.permissions"),
    buildPermissionTextsAsync(),
  ]);

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

  const categories = objectKeys(groupPermissions);
  const translators = await Promise.all(
    categories.map(async (category) => ({ category, tItem: await getI18n(`group.permission.${category}.item`) })),
  );

  translators.forEach(({ category, tItem }) => {
    const item = groupPermissions[category];
    const suffixes = typeof item !== "boolean" ? item : (["admin"] as const);

    suffixes.forEach((suffix) => {
      const key = (typeof item !== "boolean" ? `${category}-${suffix}` : "admin") as GroupPermissionKey;
      permissionLabels[key] = tItem(`${suffix}.label`);
      permissionDescriptions[key] = tItem(`${suffix}.description`);
    });
  });

  return { permissionLabels, permissionDescriptions };
};
