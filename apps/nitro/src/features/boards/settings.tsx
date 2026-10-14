import type { ReactNode } from "react";
import { useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  ColorInput,
  Fieldset,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { BoardClient, BoardDomainResources, BoardIdentity, BoardOutputs, BoardSettings } from "./contracts";
import { boardDraftPersistenceHold, boardHref, getBoardAccess } from "./contracts";
import { BoardError } from "./errors";
import { boardQueryKeys } from "./navigation";
import type { BoardPermissionPrincipals } from "./sharing";
import { BoardSharing } from "./sharing";
import { useBoardSnapshotDraft } from "./snapshot-draft";
import classes from "./boards.module.css";

export interface BoardSettingsPanelProps {
  client: BoardClient;
  resources: BoardDomainResources;
  identity: BoardIdentity;
  board: BoardOutputs["getAllBoards"][number];
  principals?: BoardPermissionPrincipals;
  renderPreview?: (settings: BoardSettings) => ReactNode;
  renderImagePicker?: (input: { label: string; value: string | null; onChange: (value: string) => void }) => ReactNode;
}

export function BoardSettingsPanel(props: BoardSettingsPanelProps) {
  const access = getBoardAccess(props.board, props.identity);
  const query = useQuery({
    queryKey: boardQueryKeys.settings(props.identity.resourceKey, props.board.id),
    queryFn: ({ signal }) => props.client.board.getBoardSettings({ id: props.board.id }, { signal }),
    enabled: access.modify,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (!access.modify) return <BoardError error={new Error("Modify permission is required to open board settings.")} />;
  if (query.data === undefined)
    return query.isError ? (
      <BoardError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <Skeleton height={320} />
    );
  return (
    <Stack>
      {query.isError && <BoardError error={query.error} retry={() => void query.refetch()} />}
      <SettingsForm
        key={`${props.identity.resourceKey}:${props.board.id}`}
        {...props}
        initial={query.data}
        fullAccess={access.full}
      />
    </Stack>
  );
}

function SettingsForm(props: BoardSettingsPanelProps & { initial: BoardSettings; fullAccess: boolean }) {
  const draft = useBoardSnapshotDraft(props.initial);
  const { value, dirty } = draft;
  const [error, setError] = useState<unknown>(null);
  const [previewing, setPreviewing] = useState(false);
  const update = <TKey extends keyof BoardSettings>(key: TKey, next: BoardSettings[TKey]) =>
    draft.update((previous) => ({ ...previous, [key]: next }));
  const reload = () => {
    draft.reload();
    setPreviewing(false);
    setError(null);
  };
  const stringField = (
    label: string,
    key: "pageTitle" | "metaTitle" | "logoImageUrl" | "faviconImageUrl" | "backgroundImageUrl",
  ) => {
    if (
      props.renderImagePicker &&
      (key === "logoImageUrl" || key === "faviconImageUrl" || key === "backgroundImageUrl")
    )
      return props.renderImagePicker({ label, value: value[key], onChange: (input) => update(key, input) });
    return (
      <TextInput label={label} value={value[key] ?? ""} onChange={(event) => update(key, event.currentTarget.value)} />
    );
  };
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>{props.board.name} settings</Title>
        <Anchor href={boardHref(props.board.name)}>Return to board</Anchor>
      </Group>
      <Alert color="yellow" title="Settings draft">
        <Text size="sm">
          {boardDraftPersistenceHold.reason}. Appearance and behavior changes remain local until one whole-domain writer
          is accepted.
        </Text>
      </Alert>
      {error !== null && <BoardError error={error} />}
      {draft.conflict && (
        <Alert color="yellow" title="Settings changed since editing began">
          <Stack gap="xs">
            <Text size="sm">
              Your local settings retain their captured baseline. Reloading discards them and adopts the latest
              settings.
            </Text>
            <Button variant="default" onClick={reload}>
              Discard draft and reload latest settings
            </Button>
          </Stack>
        </Alert>
      )}
      <Fieldset legend="General">
        <div className={classes.settingColumns}>
          {stringField("Page title", "pageTitle")}
          {stringField("Browser tab title", "metaTitle")}
          {stringField("Logo image URL", "logoImageUrl")}
          {stringField("Favicon image URL", "faviconImageUrl")}
        </div>
      </Fieldset>
      <Fieldset legend="Responsive layouts">
        <Stack>
          <Text size="sm">
            Open the board editor to select, preview, resize, add, or reset a responsive layout. Mobile and Base layout
            IDs and roles stay protected.
          </Text>
          <Anchor href={`${boardHref(props.board.name)}?edit=true&returnTo=settings`}>Open layout editor</Anchor>
        </Stack>
      </Fieldset>
      <Fieldset legend="Background">
        <Stack>
          {stringField("Background image URL", "backgroundImageUrl")}
          <div className={classes.settingColumns}>
            <Select
              label="Background attachment"
              value={value.backgroundImageAttachment}
              data={[
                { value: "fixed", label: "Fixed" },
                { value: "scroll", label: "Scroll" },
              ]}
              onChange={(input) => {
                if (input === "fixed" || input === "scroll") update("backgroundImageAttachment", input);
              }}
            />
            <Select
              label="Background size"
              value={value.backgroundImageSize}
              data={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Contain" },
              ]}
              onChange={(input) => {
                if (input === "cover" || input === "contain") update("backgroundImageSize", input);
              }}
            />
            <Select
              label="Background repeat"
              value={value.backgroundImageRepeat}
              data={["repeat", "repeat-x", "repeat-y", "no-repeat"]}
              onChange={(input) => {
                if (input === "repeat" || input === "repeat-x" || input === "repeat-y" || input === "no-repeat")
                  update("backgroundImageRepeat", input);
              }}
            />
          </div>
        </Stack>
      </Fieldset>
      <Fieldset legend="Appearance">
        <div className={classes.settingColumns}>
          <ColorInput
            label="Primary color"
            value={value.primaryColor}
            format="hex"
            onChange={(input) => update("primaryColor", input)}
          />
          <ColorInput
            label="Secondary color"
            value={value.secondaryColor}
            format="hex"
            onChange={(input) => update("secondaryColor", input)}
          />
          <ColorInput
            label="Icon color"
            value={value.iconColor ?? ""}
            format="hex"
            onChange={(input) => update("iconColor", input)}
          />
          <NumberInput
            label="Item opacity"
            suffix="%"
            value={value.opacity}
            min={0}
            max={100}
            onChange={(input) => {
              if (typeof input === "number") update("opacity", input);
            }}
          />
          <Select
            label="Item corner radius"
            value={value.itemRadius}
            data={["xs", "sm", "md", "lg", "xl"]}
            onChange={(input) => {
              if (input === "xs" || input === "sm" || input === "md" || input === "lg" || input === "xl")
                update("itemRadius", input);
            }}
          />
        </div>
      </Fieldset>
      <Fieldset legend="Custom CSS">
        <Textarea
          label="Board custom CSS"
          value={value.customCss}
          maxLength={16384}
          autosize
          minRows={8}
          onChange={(event) => update("customCss", event.currentTarget.value)}
        />
      </Fieldset>
      <Fieldset legend="Behavior">
        <Switch
          label="Disable app status indicators"
          checked={value.disableStatus}
          onChange={(event) => update("disableStatus", event.currentTarget.checked)}
        />
      </Fieldset>
      <Group className={classes.toolbar} justify="space-between">
        <Text component="output" size="sm">
          {dirty ? "Unsaved settings changes" : "Settings as loaded"}
        </Text>
        <Group>
          <Button variant="default" disabled={!dirty} onClick={reload}>
            Discard settings changes
          </Button>
          {props.renderPreview && (
            <Button
              variant="default"
              onClick={() => {
                try {
                  props.resources.schemas.boardSavePartialSettingsSchema.parse(value);
                  setPreviewing((current) => !current);
                  setError(null);
                } catch (failure) {
                  setError(failure);
                }
              }}
            >
              {previewing ? "Close appearance preview" : "Preview appearance"}
            </Button>
          )}
          <Button disabled title={boardDraftPersistenceHold.reason}>
            Save settings
          </Button>
        </Group>
      </Group>
      {previewing && props.renderPreview?.(value)}
      {props.fullAccess && (
        <BoardSharing
          client={props.client}
          identity={props.identity}
          boardId={props.board.id}
          resources={props.resources}
          principals={props.principals}
        />
      )}
    </Stack>
  );
}
