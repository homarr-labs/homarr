"use client";

import { usePathname } from "fumadocs-core/framework";
import Link from "fumadocs-core/link";
import type { Folder, Node } from "fumadocs-core/page-tree";
import { IconChevronDown } from "@tabler/icons-react";
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderTrigger,
  useFolder,
  useFolderDepth,
} from "fumadocs-ui/components/sidebar/base";
import type { MouseEvent, ReactNode } from "react";

const normalizePath = (path: string) => (path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path);

const isActivePath = (url: string, pathname: string, nested = false) => {
  const normalizedUrl = normalizePath(url);
  const normalizedPathname = normalizePath(pathname);
  return normalizedUrl === normalizedPathname || (nested && normalizedPathname.startsWith(`${normalizedUrl}/`));
};

const containsPath = (node: Node, pathname: string): boolean => {
  if (node.type === "page") return isActivePath(node.url, pathname);
  if (node.type === "folder") {
    return Boolean(
      (node.index && isActivePath(node.index.url, pathname, true)) ||
      node.children.some((child) => containsPath(child, pathname)),
    );
  }
  return false;
};

const folderItemClass =
  "relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0 transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none";

const getItemOffset = (depth: number) => `calc(${2 + 3 * depth} * var(--spacing))`;

function ToggleableFolderLink({
  active,
  children,
  external,
  href,
}: {
  active: boolean;
  children: ReactNode;
  external?: boolean;
  href: string;
}) {
  const folder = useFolder();
  const depth = useFolderDepth();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!folder?.collapsible || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (target instanceof Element && target.closest("[data-icon]")) {
      event.preventDefault();
      folder.setOpen((open) => !open);
      return;
    }

    if (active) {
      event.preventDefault();
      folder.setOpen((open) => !open);
      return;
    }

    folder.setOpen(true);
  };

  return (
    <Link
      href={href}
      external={external}
      onClickCapture={onClick}
      data-active={active}
      className={`${folderItemClass} w-full data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors`}
      style={{ paddingInlineStart: getItemOffset(depth - 1) }}
    >
      {children}
      {folder?.collapsible && (
        <IconChevronDown
          aria-hidden="true"
          data-icon="true"
          className={`ms-auto transition-transform ${folder.open ? "" : "-rotate-90 rtl:rotate-90"}`}
        />
      )}
    </Link>
  );
}

function StyledFolderTrigger({ children }: { children: ReactNode }) {
  const depth = useFolderDepth();
  const folder = useFolder();

  return (
    <SidebarFolderTrigger
      className={`${folderItemClass} ${folder?.collapsible ? "transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80" : ""} w-full`}
      style={{ paddingInlineStart: getItemOffset(depth - 1) }}
    >
      {children}
    </SidebarFolderTrigger>
  );
}

function StyledFolderContent({ children }: { children: ReactNode }) {
  const depth = useFolderDepth();

  return (
    <SidebarFolderContent
      className={`relative ${depth === 1 ? "before:absolute before:inset-y-1 before:inset-s-2.5 before:w-px before:bg-fd-border before:content-['']" : ""}`}
    >
      <div className="flex flex-col gap-0.5 pt-0.5">{children}</div>
    </SidebarFolderContent>
  );
}

export function DocsSidebarFolder({ item, children }: { item: Folder; children: ReactNode }) {
  const pathname = usePathname();
  const active = containsPath(item, pathname);

  return (
    <SidebarFolder collapsible={item.collapsible} active={active} defaultOpen={item.defaultOpen}>
      {item.index ? (
        <ToggleableFolderLink
          href={item.index.url}
          active={isActivePath(item.index.url, pathname)}
          external={item.index.external}
        >
          {item.icon}
          {item.name}
        </ToggleableFolderLink>
      ) : (
        <StyledFolderTrigger>
          {item.icon}
          {item.name}
        </StyledFolderTrigger>
      )}
      <StyledFolderContent>{children}</StyledFolderContent>
    </SidebarFolder>
  );
}
