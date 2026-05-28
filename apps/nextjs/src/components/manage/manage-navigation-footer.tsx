"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Stack, useMantineColorScheme } from "@mantine/core";
import { IconLogout, IconMoon, IconSun } from "@tabler/icons-react";



import { signOut, useSession } from "@homarr/auth/client";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";



import { useAuthContext } from "~/app/[locale]/_client-providers/session";
import { CurrentLanguageCombobox } from "../language/current-language-combobox";


const LogoutModal = createModal(() => {
  const t = useScopedI18n("common.userAvatar.menu.logoutModal");

  return ({ onTimeout }: { onTimeout: () => void }) => (
    <Stack>
      <div>{t("description")}</div>
      <Button onClick={onTimeout} fullWidth>
        {t("action")}
      </Button>
    </Stack>
  );
}).withOptions({
  centered: true,
  defaultTitle: (t) => t("common.userAvatar.menu.logoutModal.title"),
});

export const ManageNavigationFooter = () => {
  const t = useScopedI18n("common.userAvatar.menu");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const ColorSchemeIcon = colorScheme === "dark" ? IconSun : IconMoon;
  const colorSchemeText = colorScheme === "dark" ? t("switchToLightMode") : t("switchToDarkMode");

  const session = useSession();
  const router = useRouter();

  const { logoutUrl } = useAuthContext();
  const { openModal } = useModalAction(LogoutModal);

  const handleSignout = useCallback(async () => {
    await signOut({
      redirect: false,
    });
    openModal({
      onTimeout: () => {
        if (logoutUrl) {
          window.location.assign(logoutUrl);
          return;
        }
        router.refresh();
      },
    });
  }, [logoutUrl, openModal, router]);

  return (
    <Stack gap="xs">
      <Button
        variant="subtle"
        leftSection={<ColorSchemeIcon size="1rem" />}
        onClick={toggleColorScheme}
        justify="flex-start"
        fullWidth
      >
        {colorSchemeText}
      </Button>
      <CurrentLanguageCombobox width="100%" showTranslatedName={false} />
      {session.status === "authenticated" && (
        <Button
          variant="subtle"
          leftSection={<IconLogout size="1rem" />}
          onClick={handleSignout}
          color="red"
          justify="flex-start"
          fullWidth
        >
          {t("logout")}
        </Button>
      )}
    </Stack>
  );
};
