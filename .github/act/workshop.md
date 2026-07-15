# Workshop deployment with ACT

The Workshop workflow builds the same image used on the VPS and smoke-tests both Docusaurus and PocketBase. Registry login and pushes are skipped under ACT.

From the repository root:

```sh
pnpm ci:act:workshop
```

The wrapper selects `.github/workflows/deployment-workshop.yml`, derives the active Docker socket (including Docker Desktop and OrbStack contexts), and runs only the `deploy` job using a `workflow_dispatch` event.

To inspect the workflow without running it:

```sh
act workflow_dispatch --list --workflows .github/workflows/deployment-workshop.yml
```

No GitHub or registry secrets are required for the local run.
