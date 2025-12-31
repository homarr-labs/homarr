"use client";

import { useI18n } from "@homarr/translation/client";
import type { SwitchProps } from "@mantine/core";
import { Switch } from "@mantine/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";

type ShowAllSwitchProps = Pick<SwitchProps, "defaultChecked">;

export const IncludeFromAllUsersSwitch = ({ defaultChecked }: ShowAllSwitchProps) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(defaultChecked);
  const t = useI18n();

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    const params = new URLSearchParams(searchParams);
    params.set("includeFromAllUsers", event.target.checked.toString());
    if (params.has("page")) params.set("page", "1"); // Reset page to 1
    router.replace(`${pathName}?${params.toString()}`);
  };

  return (
    <Switch defaultChecked={defaultChecked} checked={checked} label={t("management.page.media.includeFromAllUsers")} onChange={onChange} />
  );
};
