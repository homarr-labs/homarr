import { useState } from "react";

export function useBoardSnapshotDraft<TSnapshot>(
  canonical: TSnapshot,
  equal: (left: TSnapshot, right: TSnapshot) => boolean = Object.is,
) {
  const [draft, setDraft] = useState({ baseline: canonical, value: canonical });
  const dirty = !equal(draft.value, draft.baseline);
  if (draft.baseline !== canonical && (!dirty || equal(draft.value, canonical)))
    setDraft({ baseline: canonical, value: canonical });
  return {
    baseline: draft.baseline,
    value: draft.value,
    dirty,
    conflict: dirty && draft.baseline !== canonical && !equal(draft.value, canonical),
    update: (update: (value: TSnapshot) => TSnapshot) =>
      setDraft((previous) => ({ ...previous, value: update(previous.value) })),
    reload: () => setDraft({ baseline: canonical, value: canonical }),
  };
}
