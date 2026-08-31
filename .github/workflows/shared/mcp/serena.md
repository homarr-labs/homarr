---
# Serena MCP Server - Multi-Language Code Analysis
# Source: https://github.com/github/gh-aw/blob/main/.github/workflows/shared/mcp/serena.md
import-schema:
  languages:
    type: array
    items:
      type: string
    required: true
    description: Languages enabled for Serena LSP analysis.
mcp-servers:
  serena:
    container: "ghcr.io/oraios/serena:1.7.0"
    args:
      - "--network"
      - "host"
    entrypoint: "/workspaces/serena/.venv/bin/serena"
    entrypointArgs:
      - "start-mcp-server"
      - "--context"
      - "codex"
      - "--project"
      - \${GITHUB_WORKSPACE}
    env:
      PATH: /tmp/gh-aw/lsp/bin:\${PATH}
    mounts:
      - \${GITHUB_WORKSPACE}:\${GITHUB_WORKSPACE}:rw
      - \${RUNNER_TOOL_CACHE}:\${RUNNER_TOOL_CACHE}:ro
      - /tmp/gh-aw/lsp:/tmp/gh-aw/lsp:ro
---

## Serena code analysis

Serena is enabled for **${{ github.aw.import-inputs.languages }}**. Activate `${{ github.workspace }}` first, then use
semantic symbol, reference, and diagnostic tools before broad text searches or edits.
