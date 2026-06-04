"use client";

import { useCallback, useEffect, useState } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";

import type { CategorySection } from "~/app/[locale]/boards/_types";

export const getCategoryCollapseStorageKey = (sectionId: string) => `homarr-section-collapsed-${sectionId}`;

const categoryCollapseChangeEventName = "homarr-section-collapse-change";

interface CategoryExpandedChangeEventDetail {
  sectionId: string;
  expanded: boolean;
}

const getInitialExpanded = (section: CategorySection) => {
  if (typeof window === "undefined") return section.collapsed;

  return (localStorage.getItem(getCategoryCollapseStorageKey(section.id)) ?? String(section.collapsed)) === "true";
};

export const useCategoryCollapse = (section: CategorySection) => {
  const { status } = useSession();
  const { mutate } = clientApi.section.changeCollapsed.useMutation();
  const [opened, setOpened] = useState(() => getInitialExpanded(section));

  const persistExpanded = useCallback(
    (expanded: boolean) => {
      if (status === "authenticated") {
        mutate({ sectionId: section.id, collapsed: expanded });
      } else if (status === "unauthenticated") {
        localStorage.setItem(getCategoryCollapseStorageKey(section.id), String(expanded));
      }
    },
    [mutate, section.id, status],
  );

  useEffect(() => {
    const handleCollapseChange = (event: Event) => {
      const { sectionId, expanded } = (event as CustomEvent<CategoryExpandedChangeEventDetail>).detail;
      if (sectionId === section.id) {
        setOpened(expanded);
      }
    };

    window.addEventListener(categoryCollapseChangeEventName, handleCollapseChange);

    return () => {
      window.removeEventListener(categoryCollapseChangeEventName, handleCollapseChange);
    };
  }, [section.id]);

  const toggle = useCallback(() => {
    setOpened((current) => {
      const expanded = !current;
      persistExpanded(expanded);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<CategoryExpandedChangeEventDetail>(categoryCollapseChangeEventName, {
            detail: {
              sectionId: section.id,
              expanded,
            },
          }),
        );
      }

      return expanded;
    });
  }, [persistExpanded, section.id]);

  return [opened, { toggle }] as const;
};
