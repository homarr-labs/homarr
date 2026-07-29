"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { BoardEditAction, BoardEditActionEvent } from "@homarr/boards/edit-mode";
import { boardEditActionEventName, requestBoardEditAction, useEditMode } from "@homarr/boards/edit-mode";
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
import { focusMobileBoardSection } from "~/components/board/mobile/mobile-section-navigation";
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

  usePreventLeaveWithDirty(isEditMode);

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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingSectionAnchorId = useRef<string | null>(null);
  const desktopLayout = getDesktopLayout(board);
  const sections = useMemo(
    () => createMobileBoardElements(board, desktopLayout.id).filter((element) => element.type === "sectionHeading"),
    [board, desktopLayout.id],
  );

  const jumpToSection = (anchorId: string) => {
    pendingSectionAnchorId.current = anchorId;
    disclosure.close();
  };

  const focusPendingSection = () => {
    const anchorId = pendingSectionAnchorId.current;
    pendingSectionAnchorId.current = null;
    if (anchorId && focusMobileBoardSection({ anchorId, reduceMotion })) return;

    moreTriggerRef.current?.focus({ preventScroll: true });
  };

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);

    try {
      const response = await signOut({ redirect: false });
      if (typeof response.url !== "string" || response.url.length === 0) {
        throw new Error("Sign out did not return a success URL");
      }
      window.location.replace(logoutUrl ?? "/auth/login");
      return true;
    } catch {
      setIsSigningOut(false);
      showErrorNotification({
        title: tProfile("logoutError.title"),
        message: tProfile("logoutError.message"),
      });
      return false;
    }
  }, [logoutUrl, tProfile]);

  return (
    <>
      <HeaderButton ref={moreTriggerRef} onClick={disclosure.open} aria-label={t("board.mobile.more")}>
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
        returnFocus={false}
        onExitTransitionEnd={focusPendingSection}
        styles={{
          content: {
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          },
        }}
        closeButtonProps={{
          "aria-label": t("common.action.close"),
          size: 44,
        }}
      >
        <Stack gap="xs" pb="calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))">
          {sections.length >= 2 && (
            <>
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
                  h="auto"
                  mih={44}
                  py="xs"
                  title={section.title}
                  style={{ marginInlineStart: (section.headingLevel - 2) * 12 }}
                  styles={{
                    label: {
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      textAlign: "start",
                    },
                  }}
                  onClick={() => jumpToSection(section.anchorId)}
                >
                  {section.title}
                </Button>
              ))}
              <Divider />
            </>
          )}
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
                loading={isSigningOut}
                onClick={() => requestBoardEditAction(handleSignOut)}
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
        </Stack>
      </Drawer>
    </>
  );
};

const anchorSelector = "a[href]:not([target='_blank']):not([download])";
const usePreventLeaveWithDirty = (isDirty: boolean) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();
  const dependenciesRef = useRef({ openConfirmModal, router, t });

  useEffect(() => {
    dependenciesRef.current = { openConfirmModal, router, t };
  }, [openConfirmModal, router, t]);

  useEffect(() => {
    if (!isDirty) return;

    const guardStateKey = "__homarrBoardEditGuard";
    const guardId = `${Date.now()}-${Math.random()}`;
    let guardedUrl = window.location.href;
    let isLeaving = false;
    let isConfirming = false;
    let isActionPending = false;
    let shouldRemoveGuardEntry = true;
    let didPageHide = false;
    let departureFallbackTimer: number | undefined;

    const pushGuardEntry = () => {
      window.history.pushState(
        {
          ...(window.history.state as Record<string, unknown> | null),
          [guardStateKey]: guardId,
        },
        document.title,
        guardedUrl,
      );
    };

    const rearmGuard = () => {
      window.clearTimeout(departureFallbackTimer);
      departureFallbackTimer = undefined;
      isLeaving = false;
      shouldRemoveGuardEntry = true;

      if (
        window.location.href === guardedUrl &&
        (window.history.state as Record<string, unknown> | null)?.[guardStateKey] !== guardId
      ) {
        pushGuardEntry();
      }
    };

    const scheduleDepartureFallback = () => {
      window.clearTimeout(departureFallbackTimer);
      departureFallbackTimer = window.setTimeout(() => {
        departureFallbackTimer = undefined;
        if (!didPageHide) {
          guardedUrl = window.location.href;
          rearmGuard();
        }
      }, 1_000);
    };

    const openLeaveConfirmation = (action: BoardEditAction) => {
      if (isConfirming) return;
      isConfirming = true;

      const dependencies = dependenciesRef.current;
      dependencies.openConfirmModal({
        title: dependencies.t("board.action.edit.confirmLeave.title"),
        children: dependencies.t("board.action.edit.confirmLeave.message"),
        async onConfirm() {
          isActionPending = true;
          isLeaving = true;
          shouldRemoveGuardEntry = false;
          didPageHide = false;

          try {
            const result = await action();
            if (result === false) {
              rearmGuard();
            } else {
              scheduleDepartureFallback();
            }
          } catch {
            rearmGuard();
          } finally {
            isActionPending = false;
            isConfirming = false;
          }
        },
        onClose() {
          if (!isActionPending) {
            isConfirming = false;
          }
        },
        confirmProps: {
          children: dependencies.t("common.action.discard"),
        },
      });
    };

    pushGuardEntry();

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const target = event.target.closest<HTMLAnchorElement>(anchorSelector);
      if (!target) return;

      event.preventDefault();
      const destination = new URL(target.href, window.location.href);

      openLeaveConfirmation(() => {
        if (destination.origin === window.location.origin) {
          dependenciesRef.current.router.replace(`${destination.pathname}${destination.search}${destination.hash}`);
        } else {
          window.location.replace(destination.href);
        }
        return true;
      });
    };

    const handlePopState = () => {
      if (isActionPending) {
        if (
          window.location.href === guardedUrl &&
          (window.history.state as Record<string, unknown> | null)?.[guardStateKey] !== guardId
        ) {
          pushGuardEntry();
        }
        return;
      }
      if (isLeaving) return;

      pushGuardEntry();
      openLeaveConfirmation(() => {
        window.history.go(-2);
        return true;
      });
    };

    const handleBoardEditAction = (event: Event) => {
      event.preventDefault();
      openLeaveConfirmation((event as BoardEditActionEvent).detail.action);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      didPageHide = false;
      guardedUrl = window.location.href;
      isLeaving = false;
      isConfirming = false;
      shouldRemoveGuardEntry = true;
      if ((window.history.state as Record<string, unknown> | null)?.[guardStateKey] !== guardId) {
        pushGuardEntry();
      }
    };

    const handlePageHide = () => {
      didPageHide = true;
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isLeaving || env.NODE_ENV === "development") return;

      event.preventDefault();
      event.returnValue = true;
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener(boardEditActionEventName, handleBoardEditAction);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener(boardEditActionEventName, handleBoardEditAction);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.clearTimeout(departureFallbackTimer);

      if (
        shouldRemoveGuardEntry &&
        window.location.href === guardedUrl &&
        (window.history.state as Record<string, unknown> | null)?.[guardStateKey] === guardId
      ) {
        window.history.back();
      }
    };
  }, [isDirty]);
};
