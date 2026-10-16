import { Alert, Button, Paper, Text, Title } from "@mantine/core";
import PocketBase from "pocketbase";
import { useEffect, useRef, useState } from "react";
import { errorMessage, platformRequest } from "../lib/platform";
import { Glyph } from "./icons";

interface AuthConfig {
  workshopApiUrl: string;
  authCollection: string;
  provider: string;
  csrfToken: string;
}

export function WorkshopSignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(false);
  const client = useRef<PocketBase | null>(null);
  useEffect(() => {
    let active = true;
    void platformRequest<AuthConfig>("/api/auth/config")
      .then((value) => {
        if (!active) return;
        setConfig(value);
        client.current = new PocketBase(value.workshopApiUrl);
        setExisting(client.current.authStore.isValid);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, []);
  async function finish() {
    const pb = client.current;
    if (!pb || !config) return;
    await platformRequest("/auth/workshop/session", null, {
      method: "POST",
      headers: { "X-CSRF-Token": config.csrfToken },
      body: JSON.stringify({ token: pb.authStore.token }),
    });
    await onSignedIn();
  }
  // Start OAuth synchronously in the click handler so browser popup policies can allow it.
  function signIn() {
    const pb = client.current;
    if (!pb || !config) return;
    setBusy(true);
    setError("");
    let authorization: Promise<unknown>;
    if (existing) authorization = pb.collection(config.authCollection).authRefresh();
    else authorization = pb.collection(config.authCollection).authWithOAuth2({ provider: config.provider });
    void authorization
      .then(finish)
      .catch((cause) => {
        setError(errorMessage(cause));
        setExisting(pb.authStore.isValid);
      })
      .finally(() => setBusy(false));
  }
  return (
    <Paper className="panel" withBorder>
      <div className="panel-icon">
        <Glyph name="user" size={26} />
      </div>
      <Title order={2}>One Homarr account.</Title>
      <Text c="dimmed" mt="sm" maw={520}>
        Use your existing Workshop account to keep a worker directory and invite other people. Private worker access
        stays on your device.
      </Text>
      <Button
        leftSection={<Glyph name="github" />}
        mt="xl"
        size="md"
        onClick={signIn}
        disabled={!config}
        loading={busy}
      >
        {existing ? "Continue with your Homarr account" : "Continue with GitHub"}
      </Button>
      {error && (
        <Alert color="red" mt="lg" role="alert">
          {error}
        </Alert>
      )}
    </Paper>
  );
}
