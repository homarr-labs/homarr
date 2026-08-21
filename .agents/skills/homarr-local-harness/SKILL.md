---
name: homarr-local-harness
description: Build and inspect a writable Docker demo harness from the current Homarr checkout when validating a local branch in a browser.
---

# Homarr Local Harness

Use this skill when a Homarr change needs a real production image and browser validation. Work from the repository root and keep the harness name Docker-safe, such as `feature-board`.

## Set up the harness

Run the TypeScript operations CLI; this workflow does not use the interactive developer TUI:

```sh
pnpm cli harness setup feature-board
```

`setup` builds the current checkout as `homarr:feature-board`, replaces the named harness container, and starts it with a persistent data volume. It enables demo mode, mock integrations, and writable demo mutations by default:

- `DEMO_MODE=true`
- `DEMO_READ_ONLY=false`
- `UNSAFE_ENABLE_MOCK_INTEGRATION=true`

Pass repeatable environment overrides when the feature needs them:

```sh
pnpm cli harness setup feature-board \
  --env WORKSHOP_WEB_URL=https://example.test \
  --env FEATURE_FLAG=true
```

Use `pnpm cli harness build <name>` when only the image is needed, and `pnpm cli harness run <name>` to start an already-built image. `--port <number>` pins a host port; otherwise Docker assigns one.

Always use the URL printed by the command. If the output is no longer available, query it directly:

```sh
pnpm cli harness port feature-board
```

Do not assume port `7575`; the container listens on `7575`, but the host port is dynamic by default.

## Browser validation

Open the printed URL with the environment's `browser-harness` tool. In this workspace, the `agent-browser` CLI is the supported browser automation fallback. Load its current workflow before invoking it:

```sh
agent-browser skills get core
```

Navigate to the exact harness URL, wait for the app to become usable, exercise the changed flow, and capture screenshots or other browser evidence. Keep browser state in a named session when the workflow needs login persistence. Report the exact URL, viewport/session used, and screenshot paths; a Docker process or HTTP health response alone is not browser acceptance.

## Cleanup

Stop the named container when finished:

```sh
pnpm cli harness stop feature-board
```

Stopping keeps the data volume so the same harness can be restarted. A later `setup` rebuilds the image and replaces only the container. Preserve unrelated containers, images, volumes, and working-tree changes.
