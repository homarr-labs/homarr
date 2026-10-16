import { Alert, Button, Group, Modal, NativeSelect, Paper, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { matchingSavedWorker, parseConnectionLink, secureConnectionMessage } from "../lib/connection";
import type { ConnectionInput, SavedWorker } from "../lib/connection";
import { clearPendingConnection, rememberPendingConnection } from "../lib/pending-connection";
import { errorMessage } from "../lib/platform";
import { Glyph } from "./icons";

function parseLink(value: string): ConnectionInput | null {
  try {
    return parseConnectionLink(value);
  } catch {
    return null;
  }
}

export function ConnectModal({
  opened,
  onClose,
  initial,
  savedWorkers,
  onConnect,
  onReplace,
  busy,
  connectionError = "",
  connectionSupported = true,
}: {
  opened: boolean;
  onClose: () => void;
  initial: string;
  savedWorkers: SavedWorker[];
  onConnect: (input: ConnectionInput, useInvitation: boolean) => Promise<void>;
  onReplace: () => void;
  busy: boolean;
  connectionError?: string;
  connectionSupported?: boolean;
}) {
  const [link, setLink] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [useInvitation, setUseInvitation] = useState(false);
  const prepared = useMemo(() => parseLink(link), [link]);
  const knownWorker = prepared && prepared.credential.kind !== "share" && matchingSavedWorker(savedWorkers, prepared);
  const reconnect = !!knownWorker && !useInvitation;
  useEffect(() => {
    if (opened) {
      setLink(initial);
      setEditing(!parseLink(initial));
      setError("");
      setName("");
      setMode("");
      setAddress("");
      setUseInvitation(false);
    }
  }, [opened, initial]);

  function replaceLink() {
    clearPendingConnection();
    onReplace();
    setLink("");
    setEditing(true);
    setName("");
    setMode("");
    setAddress("");
    setError("");
    setUseInvitation(false);
  }
  function updateLink(value: string) {
    setLink(value);
    setError("");
    rememberPendingConnection(value.trim());
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const input = parseConnectionLink(link.trim());
      rememberPendingConnection(link.trim());
      if (name.trim()) input.name = name.trim();
      if (mode === "direct") {
        input.mode = "direct";
        input.directUrl = address.trim();
      }
      if (mode === "relay") {
        input.mode = "relay";
        input.relayUrl = address.trim();
      }
      setEditing(false);
      await onConnect(input, useInvitation);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  const ready = !!prepared && !editing;
  const visibleError = error || connectionError;
  let reviewTitle = "Setup link received";
  if (prepared?.credential.kind === "invite") reviewTitle = "Invitation received";
  if (prepared?.credential.kind === "share") reviewTitle = "Sharing link received";
  if (reconnect) reviewTitle = "This browser already has access";
  let connectionHost = "Your server";
  if (prepared) {
    let reviewAddress = prepared.relayUrl;
    if (prepared.mode === "direct") reviewAddress = prepared.directUrl;
    try {
      connectionHost = new URL(reviewAddress).host;
    } catch {
      /* The connection validator shows invalid addresses. */
    }
  }
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Connect your Homarr worker"
      closeButtonProps={{ "aria-label": "Close pairing dialog" }}
      size="lg"
      centered
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      withCloseButton={!busy}
    >
      <form onSubmit={submit}>
        <Stack gap="lg">
          {ready && prepared && (
            <>
              <Paper withBorder p="lg" radius="md">
                <Group gap="sm" mb="sm">
                  <Glyph name="check" />
                  <Text fw={650}>{reviewTitle}</Text>
                </Group>
                <Text size="lg" fw={600}>
                  {prepared.name}
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
                  {connectionHost}
                </Text>
                <Text size="sm" mt="md">
                  {reconnect &&
                    "Reconnect with the access already saved in this browser. You do not need to use the invitation again."}
                  {!reconnect &&
                    "The private link is already loaded. Press Connect worker to connect this browser. You do not need to paste anything or sign in."}
                </Text>
              </Paper>
              {knownWorker && (
                <Button type="button" variant="subtle" onClick={() => setUseInvitation(!useInvitation)} disabled={busy}>
                  {!useInvitation && "Use invitation instead"}
                  {useInvitation && "Reconnect with saved access instead"}
                </Button>
              )}
              <Button type="button" variant="subtle" onClick={replaceLink} disabled={busy}>
                Use another link
              </Button>
            </>
          )}
          {!ready && (
            <>
              <Text size="sm" c="dimmed">
                Paste the complete private setup or invitation link. A server address by itself cannot grant access. No
                sign-in is needed.
              </Text>
              <Textarea
                label="Private connection link"
                placeholder="https://homarr.dev/remote/#worker=…"
                value={link}
                onChange={(event) => updateLink(event.currentTarget.value)}
                required
                rows={4}
                autoComplete="off"
                data-private="true"
                spellCheck={false}
              />
              <TextInput
                label="Server name (optional)"
                placeholder="Home server"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                maxLength={80}
              />
              <details className="connection-settings">
                <summary>Use another connection address</summary>
                <Stack mt="md" gap="md">
                  <Text size="xs" c="dimmed">
                    This changes the route only. You still need a complete private setup or invitation link.
                  </Text>
                  <NativeSelect
                    label="Connection route"
                    value={mode}
                    onChange={(event) => setMode(event.currentTarget.value)}
                    data={[
                      { value: "", label: "Use the address in this link" },
                      { value: "direct", label: "Direct · Tailscale or private HTTPS" },
                      { value: "relay", label: "Encrypted relay" },
                    ]}
                  />
                  {mode && (
                    <TextInput
                      label="Connection address"
                      placeholder="https://homarr.my-tailnet.ts.net"
                      value={address}
                      onChange={(event) => setAddress(event.currentTarget.value)}
                      required
                    />
                  )}
                </Stack>
              </details>
            </>
          )}
          {!connectionSupported && (
            <Alert color="yellow" title="Use the secure address">
              {secureConnectionMessage}
            </Alert>
          )}
          <div className="secret-note">
            <Glyph name="lock" size={14} /> Your invitation goes only to your worker through the encrypted connection.
            The account service never receives it.
          </div>
          {visibleError && (
            <Alert color="red" role="alert">
              {visibleError}
            </Alert>
          )}
          <Button
            type="submit"
            loading={busy}
            disabled={!connectionSupported}
            size="md"
            leftSection={<Glyph name="link" />}
          >
            {reconnect && "Reconnect this browser"}
            {!reconnect && "Connect worker"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
