import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { objectKeys } from "@homarr/common";
import type { GroupPermissionKey } from "@homarr/definitions";
import { groupPermissions, permissionMatrix } from "@homarr/definitions";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import type { PermissionLabels } from "./_group-permission-form";
import {
  EffectivePermissionPreview,
  MatrixRow,
  PermissionForm,
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
  const t = await getI18n();

  const permissionLabels = await buildPermissionLabels();

  return (
    <Stack>
      <Title>{t("management.page.group.setting.permissions.title")}</Title>

      <PermissionForm initialPermissions={group.permissions}>
        <Stack pos="relative">
          <PresetButtons />

          <Stack gap="md">
            {objectKeys(permissionMatrix).map((category) => (
              <MatrixRow key={category} category={category} permissionLabels={permissionLabels} />
            ))}
          </Stack>

          <EffectivePermissionPreview permissionLabels={permissionLabels} />

          <SaveAffix groupId={group.id} />
        </Stack>
      </PermissionForm>
    </Stack>
  );
}

const buildPermissionLabels = async (): Promise<PermissionLabels> => {
  const permissionLabels: PermissionLabels = {};

  for (const category of objectKeys(groupPermissions)) {
    const tItem = await getScopedI18n(`group.permission.${category}.item`);
    const item = groupPermissions[category];
    const suffixes = typeof item !== "boolean" ? item : (["admin"] as const);

    suffixes.forEach((suffix) => {
      const key = (typeof item !== "boolean" ? `${category}-${suffix}` : "admin") as GroupPermissionKey;
      permissionLabels[key] = tItem(`${suffix}.label`);
    });
  }

  return permissionLabels;
};
