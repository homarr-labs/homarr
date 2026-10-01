"use client";

import { useEffect } from "react";

import type { CodeKind, LinkKind } from "@/lib/analytics";
import { initAnalytics, normalizeDestination, track } from "@/lib/analytics";

function linkKind(link: HTMLAnchorElement): LinkKind {
  if (link.closest("#nd-sidebar")) return "sidebar";
  if (link.closest("#nd-toc")) return "toc";
  if (link.closest("header") || link.closest("#nd-nav") || link.closest("#nd-subnav")) return "nav";
  if (link.closest("footer")) return "footer";
  if (link.closest("[data-attr]")) return "cta";
  return "content";
}

function linkText(link: HTMLAnchorElement): string | undefined {
  const text = (link.getAttribute("aria-label") ?? link.textContent ?? "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 120) : undefined;
}

function codeCopy(target: EventTarget): { code_kind: CodeKind; code_language?: string } | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest("button");
  if (!button) return null;

  const label = (button.getAttribute("aria-label") ?? "").trim().toLowerCase();
  const text = (button.textContent ?? "").trim().toLowerCase();
  const surfaceElement = button.closest<HTMLElement>("[data-code-surface]");
  const surface = surfaceElement?.dataset.codeSurface;
  const language = surfaceElement?.dataset.codeLanguage;

  if (label === "copy text" || label === "copied text") {
    return surface === "docker-install"
      ? { code_kind: "docker_snippet", code_language: language ?? "yaml" }
      : { code_kind: "docs_code", code_language: language };
  }
  if (text === "copy markdown") return { code_kind: "markdown" };
  if (surface === "custom-widget" && (text === "copy" || text === "copied")) return { code_kind: "custom_widget" };
  return null;
}

export function Analytics() {
  useEffect(() => {
    initAnalytics();

    function onClick(event: MouseEvent) {
      if (event.button !== 0 && event.button !== 1) return;
      if (!(event.target instanceof Element)) return;

      const copy = codeCopy(event.target);
      if (copy) track("Code Copied", copy);

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.closest(".homarr-carbon")) return;
      const url = new URL(link.href, window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.pathname === window.location.pathname && url.origin === window.location.origin && url.hash) return;

      const destination = normalizeDestination(url);
      const source = { destination, label: link.dataset.attr, link_text: linkText(link) };
      if (url.hostname === "demo.homarr.dev") {
        track("Demo Opened", source);
        return;
      }
      if (link.dataset.attr === "Install button") {
        track("Installation Opened", source);
        return;
      }
      track("Link Clicked", {
        ...source,
        external: url.origin !== window.location.origin,
        link_kind: linkKind(link),
      });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}
