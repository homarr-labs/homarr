import { useEffect, useMemo, useRef, useState } from "react";

import type { CoolifyOptions } from "./types";

export function useAdvancedOpenSections(options: CoolifyOptions) {
  const visibleSections = useMemo(
    () =>
      [
        options.showServers ? "servers" : null,
        options.showApplications ? "applications" : null,
        options.showServices ? "services" : null,
      ].filter((section): section is string => section !== null),
    [options.showApplications, options.showServers, options.showServices],
  );
  const [openSections, setOpenSections] = useState(visibleSections);
  const previousVisibleSectionsRef = useRef(visibleSections);

  useEffect(() => {
    const newlyVisibleSections = visibleSections.filter(
      (section) => !previousVisibleSectionsRef.current.includes(section),
    );
    previousVisibleSectionsRef.current = visibleSections;
    if (newlyVisibleSections.length === 0) return;

    setOpenSections((current) => [...new Set([...current, ...newlyVisibleSections])]);
  }, [visibleSections]);

  return [openSections, setOpenSections] as const;
}
