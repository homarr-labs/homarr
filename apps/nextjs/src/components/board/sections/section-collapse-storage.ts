interface SectionCollapseStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const legacyStorageKey = (sectionId: string) => `homarr-section-collapsed-${sectionId}`;

export const sectionCollapseStorageKey = (sectionId: string) => `homarr-section-collapsed-v2-${sectionId}`;

/**
 * Legacy values represented whether the section was open even though the key
 * and database column called the value "collapsed". Migrate once into a
 * versioned key whose boolean has the corrected meaning.
 */
export const readSectionCollapsedFromStorage = (
  storage: SectionCollapseStorage,
  sectionId: string,
  fallback: boolean,
) => {
  const currentKey = sectionCollapseStorageKey(sectionId);
  const legacyKey = legacyStorageKey(sectionId);
  const current = storage.getItem(currentKey);

  if (current !== null) {
    storage.removeItem(legacyKey);
    return current === "true";
  }

  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return fallback;

  const collapsed = legacy !== "true";
  storage.setItem(currentKey, String(collapsed));
  storage.removeItem(legacyKey);
  return collapsed;
};

export const writeSectionCollapsedToStorage = (
  storage: SectionCollapseStorage,
  sectionId: string,
  collapsed: boolean,
) => {
  storage.setItem(sectionCollapseStorageKey(sectionId), String(collapsed));
  storage.removeItem(legacyStorageKey(sectionId));
};
