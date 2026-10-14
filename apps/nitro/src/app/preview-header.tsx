import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { defaultHeaderPreferences, headerPreferencesSchema } from "@homarr/validation/header-preferences";

import { HeaderComposer } from "../source-ui/settings/header-composer";

const displayBoards = [
  { id: "synthetic-home", name: "Synthetic home board", logoImageUrl: null },
  { id: "synthetic-media", name: "Synthetic media board", logoImageUrl: null },
] as const;

function initialHeaderDraft() {
  return headerPreferencesSchema.parse(defaultHeaderPreferences);
}

export function HeaderDraftPreview() {
  const [draft, setDraft] = useState(initialHeaderDraft);

  return (
    <Stack>
      <Alert color="yellow" title="Synthetic header draft: never saved">
        These are display fixtures, not your boards or account. Header items can be added, configured, moved and removed
        locally. Reloading discards this draft; no settings or private backend call is made.
      </Alert>
      <HeaderComposer
        value={draft}
        onChange={setDraft}
        boards={displayBoards}
        homeBoardId="synthetic-home"
        mobileHomeBoardId={null}
        appName="Homarr"
        logo={<img className="logo" src="/logo/logo.png" alt="Homarr" width={26} height={26} />}
      />
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Changes affect only this disposable display.
        </Text>
        <Button variant="default" onClick={() => setDraft(initialHeaderDraft())}>
          Discard local draft
        </Button>
      </Group>
    </Stack>
  );
}
