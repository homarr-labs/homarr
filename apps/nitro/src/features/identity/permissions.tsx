import { useState } from "react";
import { Alert } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";

import { objectKeys } from "../../../../../packages/common/src/object";
import {
  groupPermissionKeys,
  matrixStateToPermissions,
  permissionMatrix,
} from "../../../../../packages/definitions/src/permissions";
import type { GroupPermissionKey, PermissionMatrixState } from "../../../../../packages/definitions/src/permissions";
import { useIdentity } from "./boundary";
import { ActionFeedback, IdentityDenied, IdentityError, useIdentityAction } from "./feedback";
import { groupSavePermissionsSchema, validationMessage } from "./validation";
import { useIdentityDraft } from "./draft";
import { GroupPermissionPageView } from "../../source-ui/groups/permissions";
import type { PermissionLabels } from "../../source-ui/groups/permissions";

const presets = {
  viewer: {
    board: { level: 1, capabilities: [] },
    app: { level: 0, capabilities: ["app-use-all"] },
    integration: { level: 1, capabilities: [] },
    media: { level: 1, capabilities: [] },
  },
  editor: {
    board: { level: 2, capabilities: ["board-create"] },
    app: { level: 1, capabilities: ["app-use-all"] },
    integration: { level: 2, capabilities: ["integration-create"] },
    "search-engine": { level: 1, capabilities: [] },
    media: { level: 1, capabilities: ["media-upload"] },
  },
  admin: { admin: { level: 1, capabilities: [] } },
} satisfies Record<string, Partial<PermissionMatrixState>>;

function presetPermissions(preset: keyof typeof presets) {
  const selected: Partial<PermissionMatrixState> = presets[preset];
  const state: PermissionMatrixState = {
    board: selected.board ?? { level: 0, capabilities: [] },
    app: selected.app ?? { level: 0, capabilities: [] },
    integration: selected.integration ?? { level: 0, capabilities: [] },
    "search-engine": selected["search-engine"] ?? { level: 0, capabilities: [] },
    media: selected.media ?? { level: 0, capabilities: [] },
    other: selected.other ?? { level: 0, capabilities: [] },
    admin: selected.admin ?? { level: 0, capabilities: [] },
  };
  return matrixStateToPermissions(state);
}

export function GroupPermissionEditor({
  groupId,
  initialPermissions,
}: {
  groupId: string;
  initialPermissions: GroupPermissionKey[];
}) {
  return <GroupPermissionFields key={groupId} groupId={groupId} initialPermissions={initialPermissions} />;
}

function GroupPermissionFields({
  groupId,
  initialPermissions,
}: {
  groupId: string;
  initialPermissions: GroupPermissionKey[];
}) {
  const { principal, demo } = useIdentity();
  const tPermissions = useI18n("group.permission");
  const draft = useIdentityDraft(initialPermissions, {
    equal: (left, right) => groupPermissionKeys.every((key) => left.includes(key) === right.includes(key)),
  });
  const { value: selected, setValue: setSelected, dirty } = draft;
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  if (!principal.user.permissions.includes("admin")) return <IdentityDenied />;
  const disabled = action.pending || (demo.enabled && demo.readOnly);
  const activePreset =
    objectKeys(presets).find((preset) => {
      const keys = presetPermissions(preset);
      return groupPermissionKeys.every((key) => selected.includes(key) === keys.includes(key));
    }) ?? null;
  const permissionLabels: PermissionLabels = {};
  const permissionDescriptions: PermissionLabels = {};
  const textKeys = {
    "board-create": "board.item.create",
    "board-view-all": "board.item.view-all",
    "board-modify-all": "board.item.modify-all",
    "board-full-all": "board.item.full-all",
    "app-create": "app.item.create",
    "app-use-all": "app.item.use-all",
    "app-modify-all": "app.item.modify-all",
    "app-full-all": "app.item.full-all",
    "integration-create": "integration.item.create",
    "integration-use-all": "integration.item.use-all",
    "integration-interact-all": "integration.item.interact-all",
    "integration-full-all": "integration.item.full-all",
    "search-engine-create": "search-engine.item.create",
    "search-engine-modify-all": "search-engine.item.modify-all",
    "search-engine-full-all": "search-engine.item.full-all",
    "media-upload": "media.item.upload",
    "media-view-all": "media.item.view-all",
    "media-full-all": "media.item.full-all",
    "other-view-logs": "other.item.view-logs",
    admin: "admin.item.admin",
  } satisfies Record<GroupPermissionKey, `${string}.item.${string}`>;
  for (const key of groupPermissionKeys) {
    permissionLabels[key] = tPermissions(`${textKeys[key]}.label`);
    permissionDescriptions[key] = tPermissions(`${textKeys[key]}.description`);
  }
  return (
    <GroupPermissionPageView
      selected={selected}
      permissionLabels={permissionLabels}
      permissionDescriptions={permissionDescriptions}
      disabled={disabled}
      activePreset={activePreset}
      onPreset={(preset) => setSelected(presetPermissions(preset))}
      dirty={dirty}
      isPending={action.pending}
      holdReason="The native save is guarded pending authenticated admin, compatible-writer, current-authority-to-COMMIT and lifetime bindings. Saving remains disabled; drafts do not change stored permissions."
      changedNotice={
        draft.changed && (
          <Alert title="Stored permissions changed remotely">
            Your selected draft and original baseline are retained without merging new grants. Discard the draft to use
            the latest stored selections.
          </Alert>
        )
      }
      onLevelChange={(category, next) => {
        const levels = permissionMatrix[category].levels;
        if (!Number.isInteger(next) || next < 0 || next > levels.length) return;
        const ladder: readonly GroupPermissionKey[] = levels;
        setSelected([...selected.filter((key) => !ladder.includes(key)), ...levels.slice(0, next)]);
      }}
      onCapabilityChange={(capability, granted) => {
        if (granted) setSelected([...new Set([...selected, capability])]);
        else setSelected(selected.filter((key) => key !== capability));
      }}
      feedback={
        <>
          {validation && <IdentityError error={validation} />}
          <ActionFeedback action={action} />
        </>
      }
      onDiscard={() => {
        draft.discard();
        setValidation(null);
        action.clear();
      }}
      onSave={() => {
        const parsed = groupSavePermissionsSchema.safeParse({ groupId, permissions: selected });
        if (!parsed.success) setValidation(validationMessage(parsed.error.issues));
        else setValidation("Permission writes remain unavailable. No stored permissions have been changed.");
      }}
    />
  );
}
