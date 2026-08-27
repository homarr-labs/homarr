"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Collapse, Group, Stack } from "@mantine/core";
import { IconCategoryPlus } from "@tabler/icons-react";

import { BoardCreateForm } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

export const CreateBoardButton = () => {
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
    <Stack>
      <Group justify="end">
        <Button leftSection={<IconCategoryPlus size="1rem" />} onClick={toggle}>
          {t("new.label")}
        </Button>
      </Group>
      <Collapse expanded={isOpen}>
        <Card withBorder>
          <BoardCreateForm key={formKey} onCancel={close} />
        </Card>
      </Collapse>
    </Stack>
  );
};
