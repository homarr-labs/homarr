import type { ReactNode } from "react";
import type { MRT_Localization } from "mantine-react-table";
import { useQuery } from "@tanstack/react-query";

import type { GroupPermissionKey } from "@homarr/definitions";
import { localeConfigurations } from "@homarr/translation";
import type { TranslationFunction } from "@homarr/translation";
import { useCurrentLocale } from "@homarr/translation/client";

export interface UserSummary {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
}

export interface UserRow extends UserSummary {
  emailVerified: Date | string | null;
}

export interface InviteRow {
  id: string;
  creator: { id: string; name: string | null };
  expirationDate: Date | string;
}

export interface ApiKeyRow {
  id: string;
  user: UserSummary;
}

export interface SelectedUserGroup {
  id: string;
  name: string;
  permissions: readonly GroupPermissionKey[];
}

export interface UserTableOptions {
  loading?: boolean;
  refreshing?: boolean;
  localization?: Partial<MRT_Localization>;
}

export type UserAvatarRenderer = (user: UserSummary, size: "sm" | "lg" | "xl" | number) => ReactNode;

export function useUserTableLocalization(override?: Partial<MRT_Localization>) {
  const locale = useCurrentLocale();
  const query = useQuery({
    queryKey: ["mantine-react-table-locale", locale],
    queryFn: () => localeConfigurations[locale].importMrtLocalization(),
  });
  return override ?? query.data;
}

export function getUserFieldLabel(field: PropertyKey | undefined, t: TranslationFunction) {
  const labels = [
    { field: "name", label: t("user.field.username.label") },
    { field: "username", label: t("user.field.username.label") },
    { field: "email", label: t("user.field.email.label") },
    { field: "password", label: t("user.field.password.label") },
    { field: "confirmPassword", label: t("user.field.passwordConfirm.label") },
    { field: "previousPassword", label: t("user.field.previousPassword.label") },
    { field: "groupIds", label: t("common.entity.groups") },
  ];
  return labels.find((entry) => entry.field === field)?.label ?? t("common.error");
}
