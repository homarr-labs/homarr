import { IconBrandDiscord, IconBrandGithub, IconBrandReddit, IconBuildingStore, IconHeart } from "@tabler/icons-react";
import Image from "next/image";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="homarr-brand">
          <Image className="homarr-brand-logo" src="/img/logo.svg" alt="" width={30} height={20} aria-hidden />
          <span className="homarr-brand-name">Homarr</span>
        </span>
      ),
    },
    links: [
      {
        text: "Documentation",
        url: "/docs",
        active: "nested-url",
      },
      {
        text: "Workshop",
        url: "/workshop",
        active: "nested-url",
      },
      {
        text: "API",
        url: "/api-reference",
        active: "url",
      },
      {
        text: "Blog",
        url: "/blog",
        active: "nested-url",
        secondary: true,
      },
      {
        text: "Community",
        url: "/docs/community",
        active: "nested-url",
        secondary: true,
      },
      {
        text: "About us",
        url: "/about-us",
        active: "url",
        secondary: true,
      },
      {
        type: "icon",
        text: "Donate",
        label: "Donate to Homarr",
        icon: <IconHeart />,
        url: "https://opencollective.com/homarr",
        external: true,
        on: "menu",
      },
      {
        type: "icon",
        text: "Workshop",
        label: "Open Community Workshop",
        icon: <IconBuildingStore />,
        url: "/workshop",
        on: "menu",
      },
      {
        type: "icon",
        text: "Discord",
        label: "Join Homarr on Discord",
        icon: <IconBrandDiscord />,
        url: "https://discord.com/invite/aCsmEV5RgA",
        external: true,
        on: "menu",
      },
      {
        type: "icon",
        text: "Reddit",
        label: "Visit Homarr on Reddit",
        icon: <IconBrandReddit />,
        url: "https://www.reddit.com/r/homarr/",
        external: true,
        on: "menu",
      },
      {
        type: "icon",
        text: "GitHub",
        label: "Open Homarr on GitHub",
        icon: <IconBrandGithub />,
        url: "https://github.com/homarr-labs/homarr",
        external: true,
      },
    ],
  };
}
