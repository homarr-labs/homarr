"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Box, Button, Divider, Drawer, Group, Menu, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure, useHotkeys, useReducedMotion } from "@mantine/hooks";
import {
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconLayoutBoard,
  IconPencil,
  IconPencilOff,
  IconPlug,
  IconPlus,
  IconReplace,
  IconResize,
  IconSettings,
  IconDotsVertical,
  IconHome,
  IconLogin,
  IconList,
  IconLogout,
  IconTool,
  IconUser,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { signOut, useSession } from "@homarr/auth/client";
import { getDesktopLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { hotkeys } from "@homarr/definitions";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useAuthContext } from "~/app/[locale]/_client-providers/session";
import { useItemActions } from "~/components/board/items/item-actions";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useBoardPermissions } from "~/components/board/permissions/client";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { useDynamicSectionActions } from "~/components/board/sections/dynamic/dynamic-actions";
import { createMobileBoardElements } from "~/components/board/mobile/mobile-layout";
import { useIsMobileBoard } from "~/components/board/use-mobile-board";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { CurrentColorSchemeCombobox } from "~/components/color-scheme/current-color-scheme-combobox";
import { CurrentLanguageCombobox } from "~/components/language/current-language-combobox";
import { HeaderButton } from "~/components/layout/header/button";

export const BoardContentHeaderActions = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  const isMobile = useIsMobileBoard();
  const t = useI18n();

  if (isMobile) {
    return <MobileMoreMenu showSettings={hasChangeAccess && !demoReadOnly} />;
  }

  if (!hasChangeAccess) {
    return <SelectBoardsMenu />;
  }

  return (
    <>
      {isEditMode && !isMobile && <AddMenu />}

      <EditModeMenu demoReadOnly={demoReadOnly} hidden={isMobile} />

      {!demoReadOnly && (
        <OnboardingTour.Target id="board-settings">
          <HeaderButton href={`/boards/${board.name}/settings`} aria-label={t("item.menu.label.settings")}>
            <IconSettings stroke={1.5} />
          </HeaderButton>
        </OnboardingTour.Target>
      )}

      <SelectBoardsMenu />
    </>
  );
};

const AddMenu = () => {
  const { data: session } = useSession();
  const { openModal: openCategoryEditModal } = useModalAction(CategoryEditModal);
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { openModal: openAppSelectModal } = useModalAction(AppSelectModal);
  const { openModal: openIntegrationSelectModal } = useModalAction(IntegrationSelectModal);
  const { addCategoryToEnd } = useCategoryActions();
  const { addDynamicSection } = useDynamicSectionActions();
  const { createItem } = useItemActions();
  const t = useI18n();

  const handleAddCategory = useCallback(
    () =>
      openCategoryEditModal(
        {
          category: {
            id: "new",
            name: "",
          },
          onSuccess({ name }) {
            addCategoryToEnd({ name });
          },
          submitLabel: t("section.category.create.submit"),
        },
        {
          title: (t) => t("section.category.create.title"),
        },
      ),
    [addCategoryToEnd, openCategoryEditModal, t],
  );

  const handleSelectItem = useCallback(() => {
    openItemSelectModal();
  }, [openItemSelectModal]);

  const handleSelectApp = useCallback(() => {
    openAppSelectModal({
      onSelect: (app) => {
        createItem({
          kind: "app",
          options: { appId: app.id },
        });
      },
      withCreate: session?.user.permissions.includes("app-create") ?? false,
    });
  }, [openAppSelectModal, createItem]);

  const handleAddIntegration = useCallback(() => {
    openIntegrationSelectModal({});
  }, [openIntegrationSelectModal]);

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <HeaderButton w="auto" px={4} aria-label={t("common.action.add")}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item leftSection={<IconResize size={20} />} onClick={handleSelectItem}>
          {t("item.action.create")}
        </Menu.Item>

        <Menu.Item leftSection={<IconBox size={20} />} onClick={handleSelectApp}>
          {t("app.action.add")}
        </Menu.Item>

        <Menu.Item leftSection={<IconPlug size={20} />} onClick={handleAddIntegration}>
          {t("integration.action.create")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item leftSection={<IconBoxAlignTop size={20} />} onClick={handleAddCategory}>
          {t("section.category.action.create")}
        </Menu.Item>

        <Menu.Item leftSection={<IconResize size={20} />} onClick={addDynamicSection}>
          {t("section.dynamic.action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const EditModeMenu = ({ demoReadOnly, hidden }: { demoReadOnly: boolean; hidden: boolean }) => {
  const [isEditMode, { open, close }] = useEditMode();
  const board = useRequiredBoard();
  const utils = clientApi.useUtils();
  const t = useScopedI18n("board.action.edit");
  const tItem = useScopedI18n("item");
  const { mutate: saveBoard, isPending } = clientApi.board.saveBoard.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("notification.success.title"),
        message: t("notification.success.message"),
      });
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void revalidatePathActionAsync(`/boards/${board.name}`);
      close();
    },
    onError() {
      showErrorNotification({
        title: t("notification.error.title"),
        message: t("notification.error.message"),
      });
    },
  });

  const discardDemoChanges = useCallback(() => {
    void utils.board.getBoardByName.invalidate({ name: board.name });
    close();
  }, [utils, board.name, close]);

  const toggle = useCallback(() => {
    if (hidden) return;
    if (isEditMode) {
      if (demoReadOnly) return discardDemoChanges();
      return saveBoard(board);
    }
    open();
  }, [board, isEditMode, demoReadOnly, saveBoard, open, discardDemoChanges, hidden]);

  useHotkeys([[hotkeys.toggleBoardEdit, toggle]]);
  usePreventLeaveWithDirty(isEditMode);

  if (hidden) return null;

  return (
    <OnboardingTour.Target id="board-edit-mode">
      <HeaderButton onClick={toggle} loading={isPending} aria-label={tItem("action.edit")}>
        {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
      </HeaderButton>
    </OnboardingTour.Target>
  );
};

const SelectBoardsMenu = () => {
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery();
  const t = useI18n();

  return (
    <OnboardingTour.Target id="board-switcher">
      <Box>
        <Menu position="bottom-end">
          <Menu.Target>
            <HeaderButton w="auto" px={4} aria-label={t("board.mobile.currentBoard")}>
              <IconReplace stroke={1.5} />
            </HeaderButton>
          </Menu.Target>
          <Menu.Dropdown style={{ transform: "translate(-7px, 0)" }}>
            <ScrollArea.Autosize mah={300}>
              {boards.map((board) => (
                <Menu.Item
                  key={board.id}
                  component={Link}
                  href={`/boards/${board.name}`}
                  leftSection={<IconLayoutBoard size={20} />}
                >
                  {board.name}
                </Menu.Item>
              ))}
            </ScrollArea.Autosize>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </OnboardingTour.Target>
  );
};

const MobileMoreMenu = ({ showSettings }: { showSettings: boolean }) => {
  const board = useRequiredBoard();
  const { data: session } = useSession();
  const { logoutUrl } = useAuthContext();
  const t = useI18n();
  const tProfile = useScopedI18n("common.userAvatar.menu");
  const reduceMotion = useReducedMotion();
  const [opened, disclosure] = useDisclosure(false);
  const desktopLayout = getDesktopLayout(board);
  const sections = useMemo(
    () => createMobileBoardElements(board, desktopLayout.id).filter((element) => element.type === "sectionHeading"),
    [board, desktopLayout.id],
  );

  const jumpToSection = (anchorId: string) => {
    disclosure.close();
    requestAnimationFrame(() => {
      const heading = document.getElementById(anchorId);
      heading?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <HeaderButton onClick={disclosure.open} aria-label={t("board.mobile.more")}>
        <IconDotsVertical stroke={1.5} />
      </HeaderButton>
      <Drawer
        opened={opened}
        onClose={disclosure.close}
        title={t("board.mobile.more")}
        position="bottom"
        size="auto"
        padding="md"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        <Stack gap="xs" pb="calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))">
          <Button
            component={Link}
            href="/boards"
            variant="subtle"
            size="lg"
            justify="flex-start"
            leftSection={<IconHome size={20} />}
          >
            {tProfile("homeBoard")}
          </Button>
          <CurrentColorSchemeCombobox w="100%" />
          <CurrentLanguageCombobox width="100%" withinPortal={false} />
          {session ? (
            <>
              <Button
                component={Link}
                href={`/manage/users/${session.user.id}/general`}
                variant="subtle"
                size="lg"
                justify="flex-start"
                leftSection={<IconUser size={20} />}
              >
                {tProfile("preferences")}
              </Button>
              <Button
                component={Link}
                href="/manage"
                variant="subtle"
                size="lg"
                justify="flex-start"
                leftSection={<IconTool size={20} />}
              >
                {tProfile("management")}
              </Button>
              <Button
                variant="subtle"
                color="red"
                size="lg"
                justify="flex-start"
                leftSection={<IconLogout size={20} />}
                onClick={() => {
                  void signOut({ redirect: false }).then(() => {
                    window.location.assign(logoutUrl ?? "/auth/login");
                  });
                }}
              >
                {tProfile("logout")}
              </Button>
            </>
          ) : (
            <Button
              component={Link}
              href="/auth/login"
              variant="subtle"
              size="lg"
              justify="flex-start"
              leftSection={<IconLogin size={20} />}
            >
              {tProfile("login")}
            </Button>
          )}
          {showSettings && (
            <Button
              component={Link}
              href={`/boards/${board.name}/settings`}
              variant="subtle"
              size="lg"
              justify="flex-start"
              leftSection={<IconSettings size={20} />}
            >
              {t("item.menu.label.settings")}
            </Button>
          )}
          {sections.length >= 2 && (
            <>
              {showSettings && <Divider />}
              <Group gap="xs" px="sm" pt="xs">
                <IconList size={18} aria-hidden />
                <Text size="sm" fw={600}>
                  {t("board.mobile.sections")}
                </Text>
              </Group>
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant="subtle"
                  size="lg"
                  justify="flex-start"
                  onClick={() => jumpToSection(section.anchorId)}
                >
                  {section.title}
                </Button>
              ))}
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
};

const anchorSelector = "a[href]:not([target='_blank'])";
const usePreventLeaveWithDirty = (isDirty: boolean) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (event: Event) => {
      const target = (event.target as HTMLElement).closest("a");

      if (!target) {
        console.warn("No anchor element found for click event", event);
        return;
      }

      event.preventDefault();

      openConfirmModal({
        title: t("board.action.edit.confirmLeave.title"),
        children: t("board.action.edit.confirmLeave.message"),
        onConfirm() {
          router.push(target.href);
        },
        confirmProps: {
          children: t("common.action.discard"),
        },
      });
    };

    const handlePopState = (event: Event) => {
      window.history.pushState(null, document.title, window.location.href);
      event.preventDefault();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return;

      event.preventDefault();
      event.returnValue = true;
    };

    const anchors = document.querySelectorAll(anchorSelector);
    anchors.forEach((link) => {
      link.addEventListener("click", handleClick);
    });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      anchors.forEach((link) => {
        link.removeEventListener("click", handleClick);
      });
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
};
