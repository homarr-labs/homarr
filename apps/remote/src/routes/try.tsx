import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { appHome } from "../lib/base-path";
import { Glyph, Mark } from "../components/icons";

export const Route = createFileRoute("/try")({ component: TryHomarr });

function TryHomarr() {
  return (
    <main className="try-page">
      <header className="shared-heading">
        <a className="brand" href={appHome}>
          <Mark small />
          <span>
            homarr<small>Try the demo</small>
          </span>
        </a>
        <Button component="a" href={appHome} variant="default">
          Open Homarr
        </Button>
      </header>
      <div className="try-intro">
        <div className="eyebrow">Start here</div>
        <h1>Your server. A dashboard in your browser.</h1>
        <p>
          The worker is Homarr running on your server. This page connects to it privately. You can try the dashboard and
          sharing without an account.
        </p>
      </div>
      <div className="try-flow" aria-label="Your browser connects privately to Homarr on your server">
        <div>
          <Glyph name="user" />
          <strong>Your browser</strong>
          <span>Shows the dashboard</span>
        </div>
        <span className="try-arrow" aria-hidden="true">
          ↔
        </span>
        <div>
          <Glyph name="lock" />
          <strong>Encrypted connection</strong>
          <span>Through the relay or Tailscale</span>
        </div>
        <span className="try-arrow" aria-hidden="true">
          ↔
        </span>
        <div>
          <Glyph name="server" />
          <strong>Your server</strong>
          <span>Keeps your Homarr data</span>
        </div>
      </div>
      <ol className="try-steps">
        <li>
          <Paper className="panel" withBorder>
            <Title order={2}>Open the secure demo address.</Title>
            <Text c="dimmed" mt="sm">
              Open the address printed by the demo launcher. On the Docker computer, localhost works. From another
              device, use the HTTPS address and connect to the same Tailscale network.
            </Text>
            <Text size="sm" mt="md">
              An HTTP IP address will not work: your browser needs HTTPS or localhost to create the private connection.
            </Text>
          </Paper>
        </li>
        <li>
          <Paper className="panel" withBorder>
            <Title order={2}>Connect your server.</Title>
            <Text c="dimmed" mt="sm">
              Open the private pairing link printed by the launcher and choose <strong>Connect worker</strong>. If you
              already have this page open, use <strong>Connect worker</strong> and paste the link.
            </Text>
            <Text size="sm" mt="md">
              The setup link works once. After pairing, this browser remembers your server. Return to Homarr and choose{" "}
              <strong>Open</strong> next time.
            </Text>
          </Paper>
        </li>
        <li>
          <Paper className="panel" withBorder>
            <Title order={2}>Try a dashboard, then share it.</Title>
            <Text c="dimmed" mt="sm">
              Open <strong>Demo-dashboard</strong>. Choose <strong>Manage access</strong>, select that dashboard, and
              choose <strong>Create private link</strong>. Keep “Allow anyone with this link” enabled for this first
              try.
            </Text>
            <Text size="sm" mt="md">
              Open the link in a private browser window to see the guest view. Back in your owner window, choose{" "}
              <strong>Revoke</strong> under sharing links. The guest dashboard closes.
            </Text>
          </Paper>
        </li>
      </ol>
      <Paper className="panel" withBorder>
        <Group align="start" gap="md">
          <div className="node-icon worker">
            <Glyph name="key" />
          </div>
          <Stack gap="xs" className="grow">
            <Title order={3}>Sign-in is optional.</Title>
            <Text size="sm" c="dimmed">
              Your account keeps a list of servers and lets you invite other people to that list. Pairing, reading a
              dashboard, and creating a sharing link work without signing in.
            </Text>
            <Text size="sm" c="dimmed">
              A demo on Tailscale is still private to that network. A guest needs network access as well as the sharing
              link.
            </Text>
          </Stack>
        </Group>
      </Paper>
      <details className="try-help">
        <summary>If you get stuck</summary>
        <Stack gap="md" mt="lg">
          <div>
            <strong>The page says HTTPS is required.</strong>
            <p>Use the HTTPS hostname printed by the launcher, rather than an HTTP IP address.</p>
          </div>
          <div>
            <strong>The setup link was already used.</strong>
            <p>
              Open the server from the browser you paired earlier, or ask an owner for a new device invitation. The demo
              launcher can reset its own demo data when you want a fresh start.
            </p>
          </div>
          <div>
            <strong>The server cannot be reached.</strong>
            <p>
              Check that the demo is running and this device is on the same Tailscale network. A saved server's Settings
              let you choose another connection address.
            </p>
          </div>
        </Stack>
      </details>
      <Group mt="xl">
        <Button component="a" href={appHome} size="md" leftSection={<Glyph name="arrow" />}>
          Open Homarr
        </Button>
        <Text size="sm" c="dimmed">
          Keep the owner window open while you try sharing.
        </Text>
      </Group>
    </main>
  );
}
