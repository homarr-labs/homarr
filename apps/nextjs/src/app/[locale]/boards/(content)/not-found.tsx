import { IconHomeOff } from "@tabler/icons-react";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import { db } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import { getI18n } from "@homarr/translation/server";

import type { BoardNotFoundProps } from "~/components/board/not-found";
import { BoardNotFound } from "~/components/board/not-found";
import { homarrLogoPath } from "~/components/layout/logo/constants";

export default async function NotFoundBoardHomePage() {
  const boardNotFoundProps = await getPropsAsync();

  return <BoardNotFound {...boardNotFoundProps} />;
}

const getPropsAsync = async (): Promise<BoardNotFoundProps> => {
  const boardCount = await db.$count(boards);
  const t = await getI18n("board");

  if (boardCount === 0) {
    const { branding } = await getRscServerSettingsAsync();
    return {
      icon: { src: branding.logoImageUrl ?? homarrLogoPath, alt: `${branding.appName} logo` },
      title: t("error.noBoard.title"),
      description: t("error.noBoard.description"),
      link: { label: t("error.noBoard.link"), href: "/manage/boards" },
      notice: t("error.noBoard.notice"),
    };
  }

  const session = await auth();
  const isAdmin = session?.user.permissions.includes("admin");
  const type = isAdmin ? "admin" : session !== null ? "user" : "anonymous";
  const href = {
    admin: "/manage/settings",
    user: `/manage/users/${session?.user.id}/general`,
    anonymous: "/manage/boards",
  }[type];

  return {
    icon: IconHomeOff,
    title: t("error.homeBoard.title"),
    description: t(`error.homeBoard.${type}.description` as never),
    link: { label: t(`error.homeBoard.${type}.link` as never), href },
    notice: t(`error.homeBoard.${type}.notice` as never),
  };
};
