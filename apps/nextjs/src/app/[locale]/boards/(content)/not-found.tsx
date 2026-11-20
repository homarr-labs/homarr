import { IconHomeOff } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import type { BoardNotFoundProps } from "~/components/board/not-found";
import { BoardNotFound } from "~/components/board/not-found";
import { homarrLogoPath } from "~/components/layout/logo/constants";

export default async function NotFoundBoardHomePage() {
  const boardNotFoundProps = await getPropsAsync();

  return <BoardNotFound {...boardNotFoundProps} />;
}

const getPropsAsync = async (): Promise<BoardNotFoundProps> => {
  const [session, accessibleBoards, t] = await Promise.all([auth(), api.board.getAllBoards(), getI18n("board")]);
  const canCreateBoards = session?.user.permissions.includes("board-create") ?? false;

  if (accessibleBoards.length === 0 && session && !canCreateBoards) {
    return {
      icon: IconHomeOff,
      title: t("error.homeBoard.noAccess.title"),
      description: t("error.homeBoard.noAccess.description"),
      link: { label: t("error.notFound.link"), href: "/manage/boards" },
      notice: t("error.homeBoard.noAccess.notice"),
    };
  }

  if (accessibleBoards.length === 0 && canCreateBoards) {
    const { branding } = await getRscServerSettingsAsync();
    return {
      icon: { src: branding.logoImageUrl ?? homarrLogoPath, alt: `${branding.appName} logo` },
      title: t("error.noBoard.title"),
      description: t("error.noBoard.description"),
      link: { label: t("error.noBoard.link"), href: "/manage/boards?create=true" },
      notice: t("error.noBoard.notice"),
    };
  }

  let type: "admin" | "user" | "anonymous" = "anonymous";
  let href = "/manage/boards";
  if (session) {
    type = "user";
    href = `/manage/users/${session.user.id}/general`;
  }
  if (session?.user.permissions.includes("admin")) {
    type = "admin";
    href = "/manage/settings";
  }

  return {
    icon: IconHomeOff,
    title: t("error.homeBoard.title"),
    description: t(`error.homeBoard.${type}.description` as never),
    link: { label: t(`error.homeBoard.${type}.link` as never), href },
    notice: t(`error.homeBoard.${type}.notice` as never),
  };
};
