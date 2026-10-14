import { Alert } from "@mantine/core";

import { HeaderComposer } from "../../source-ui/settings/header-composer";
import type { HeaderComposerProps } from "../../source-ui/settings/header-composer";
import type { HeaderPreferences } from "../../../../../packages/validation/src/header-preferences";

export function HeaderPreferencesEditor({
  value,
  onChange,
  boards,
  disabled,
  homeBoardId = null,
  mobileHomeBoardId = null,
  presentation,
}: {
  readonly value: HeaderPreferences;
  readonly onChange: (value: HeaderPreferences) => void;
  readonly boards: readonly { value: string; label: string; logoImageUrl?: string | null }[];
  readonly disabled: boolean;
  readonly homeBoardId?: string | null;
  readonly mobileHomeBoardId?: string | null;
  readonly presentation?: Pick<HeaderComposerProps, "appName" | "logo" | "renderBoardPreview">;
}) {
  if (!presentation)
    return (
      <Alert color="yellow">
        Header composer unavailable until the source branding and preview presentation are bound. Saved header items are
        retained.
      </Alert>
    );
  return (
    <HeaderComposer
      {...presentation}
      value={value}
      onChange={onChange}
      boards={boards.map((board) => ({ id: board.value, name: board.label, logoImageUrl: board.logoImageUrl ?? null }))}
      homeBoardId={homeBoardId}
      mobileHomeBoardId={mobileHomeBoardId}
      disabled={disabled}
    />
  );
}
