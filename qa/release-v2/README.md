# Release-v2 mega QA seeder

This test-only harness creates deterministic users, boards, layouts, containers, integrations, Custom Widgets, and all current widget kinds for release-v2 browser QA. It does not change production migrations or the normal demo seed.

## Requirements

- Run the normal database migrations and base seed first.
- Use an isolated SQLite database through `DB_DRIVER=better-sqlite3` and an absolute `DB_URL`.
- Start the fixture service and provide its loopback URL as `QA_FIXTURE_URL`.
- Put the disposable QA password in a file and provide its path through `QA_PASSWORD_FILE`. The password is hashed and never written to the fixture manifest.
- Set the exact profile flags shown below. The seeder rejects missing, malformed, or mismatched values before changing the database.

## Commands

Start the deterministic fixture service:

```bash
pnpm qa:release-v2:fixtures -- --ready-file /tmp/release-v2-fixture-ready.json
```

Seed a populated writable fixture:

```bash
DB_DRIVER=better-sqlite3 \
DB_URL=/absolute/path/to/qa.sqlite \
QA_FIXTURE_URL=http://127.0.0.1:<fixture-port> \
QA_PASSWORD_FILE=/absolute/path/to/qa-password \
DEMO_MODE=true \
DEMO_READ_ONLY=false \
UNSAFE_ENABLE_MOCK_INTEGRATION=true \
pnpm qa:release-v2:seed -- \
  --profile main-writable \
  --output /absolute/path/to/output \
  --reset
```

Supported profiles:

| Profile            | `DEMO_MODE` | `DEMO_READ_ONLY` | `UNSAFE_ENABLE_MOCK_INTEGRATION` |
| ------------------ | ----------- | ---------------- | -------------------------------- |
| `main-writable`    | `true`      | `false`          | `true`                           |
| `main-readonly`    | `true`      | `true`           | `true`                           |
| `onboarding-fresh` | `false`     | `false`          | `true`                           |
| `degraded`         | `true`      | `false`          | `true`                           |

`onboarding-fresh` requires no QA password and removes only resources with fixed `qa-v2-*` identifiers. Populated profiles are idempotent. `--reset` remains narrowly scoped to those deterministic identifiers.

The generated `fixture-manifest.json` records the checkout SHA, profile, non-secret persona login usernames, boards, layouts, item counts, expected permissions, fixture URL, and runtime flags. It never contains a password, password hash, token, encryption key, or Custom Widget secret.
