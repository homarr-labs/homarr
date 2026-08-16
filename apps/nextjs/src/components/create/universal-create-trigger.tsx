"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { HeaderButton } from "~/components/layout/header/button";
import { UniversalCreateModal } from "./universal-create-modal";

export const UniversalCreateHeaderAction = () => {
  const t = useScopedI18n("universalCreate");
  const { openModal } = useModalAction(UniversalCreateModal);

  return (
    <HeaderButton onClick={() => openModal({ entryPoint: "header" })} aria-label={t("trigger.label")}>
      <IconPlus stroke={1.5} />
    </HeaderButton>
  );
};

export const UniversalCreateQueryGate = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openModal } = useModalAction(UniversalCreateModal);
  const handled = useRef(false);
  const shouldOpen = searchParams.get("create") === "true";

  useEffect(() => {
    if (!shouldOpen) {
      handled.current = false;
      return;
    }
    if (handled.current) return;

    handled.current = true;
    openModal({ entryPoint: "spotlight" });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("create");
    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [openModal, pathname, router, searchParams, shouldOpen]);

  return null;
};
