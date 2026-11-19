"use client";

import type { PropsWithChildren } from "react";
import { UnstyledButton } from "@mantine/core";

import { SAFE_NEW_TAB_REL } from "../common/application-url";
import type { WidgetComponentProps } from "../definition";

interface AppLinkProps {
  href: string | undefined;
  openIn: WidgetComponentProps<"app">["options"]["openIn"];
  enabled: boolean;
}

export const AppLink = ({ href, openIn, enabled, children }: PropsWithChildren<AppLinkProps>) => {
  const protocol = href?.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  const isWebLink = protocol === undefined || protocol === "http" || protocol === "https";
  const openInNewWindow = openIn === "newWindow" && isWebLink;

  return enabled ? (
    <UnstyledButton
      component="a"
      href={href}
      target={openIn === "newTab" || openInNewWindow ? "_blank" : undefined}
      rel={openIn !== "currentTab" ? SAFE_NEW_TAB_REL : undefined}
      onClick={(event) => {
        if (
          !openInNewWindow ||
          !href ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        // Use the link's Shift-click behavior instead of requesting a popup.
        event.currentTarget.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            shiftKey: true,
          }),
        );
      }}
      h="100%"
      w="100%"
    >
      {children}
    </UnstyledButton>
  ) : (
    children
  );
};
