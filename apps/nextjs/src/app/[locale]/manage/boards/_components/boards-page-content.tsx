"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Collapse } from "@mantine/core";
import { IconCategoryPlus } from "@tabler/icons-react";

import { BoardCreateForm } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

import { TourTarget } from "~/components/layout/header/tour-target";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";

interface BoardsPageContentProps {
  title: string;
  canCreateBoards: boolean;
}

export const BoardsPageContent = ({ title, canCreateBoards, children }: PropsWithChildren<BoardsPageContentProps>) => {
  const t = useI18n("management.page.board.action");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(searchParams.get("create") === "true");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (searchParams.get("create") !== "true") return;

    setFormKey((value) => value + 1);
    setIsOpen(true);
  }, [searchParams]);

  const close = () => {
    setIsOpen(false);
    setFormKey((value) => value + 1);
    if (searchParams.has("create")) router.replace("/manage/boards", { scroll: false });
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }

    setFormKey((value) => value + 1);
    setIsOpen(true);
  };

  return (
    <ManagePageLayout
      title={title}
      primaryAction={
        canCreateBoards && (
          <TourTarget id="manage-boards-create">
            <Button leftSection={<IconCategoryPlus size="1rem" />} onClick={toggle} aria-expanded={isOpen}>
              {t("new.label")}
            </Button>
          </TourTarget>
        )
      }
    >
      {canCreateBoards && (
        <Collapse expanded={isOpen}>
          <Card withBorder>
            <BoardCreateForm key={formKey} onCancel={close} />
          </Card>
        </Collapse>
      )}
      {children}
    </ManagePageLayout>
  );
};
