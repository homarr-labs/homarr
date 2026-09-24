#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:47576}"
api_key="${API_KEY:?Set API_KEY to the disposable Homarr API key}"

tmp_dir="${TMPDIR:-/tmp}/homarr-mcp-check.$$"
mkdir -m 700 "$tmp_dir"
trap 'rm -rf "$tmp_dir"' EXIT

request() {
  local method="$1"
  local body="$2"
  local name="${3:-verification}"
  curl --fail-with-body --silent --show-error --dump-header "$tmp_dir/headers" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H "ApiKey: $api_key" \
    -H "Mcp-Method: $method" \
    -H "Mcp-Name: $name" \
    --data "$body" "$base_url/api/mcp" >"$tmp_dir/body"
  cat "$tmp_dir/body"
}

curl --fail-with-body --silent --show-error --dump-header "$tmp_dir/no-key-headers" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Method: tools/list' -H 'Mcp-Name: verification' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  "$base_url/api/mcp" >"$tmp_dir/no-key-body" || true
grep -q '^HTTP/.* 401' "$tmp_dir/no-key-headers"
grep -qi '^WWW-Authenticate: Bearer resource_metadata=' "$tmp_dir/no-key-headers"

curl --fail-with-body --silent --show-error --dump-header "$tmp_dir/bad-key-headers" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'ApiKey: invalid.invalid' -H 'Mcp-Method: tools/list' -H 'Mcp-Name: verification' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  "$base_url/api/mcp" >"$tmp_dir/bad-key-body" || true
grep -q '^HTTP/.* 401' "$tmp_dir/bad-key-headers"
grep -qi '^WWW-Authenticate: Bearer resource_metadata=' "$tmp_dir/bad-key-headers"

request tools/list '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"verification","version":"1.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}' >"$tmp_dir/list.json"
python3 - "$tmp_dir/list.json" <<'PY'
import json
import sys

raw = open(sys.argv[1], encoding="utf-8").read()
line = next(line[6:] for line in raw.splitlines() if line.startswith("data: ")) if "data: " in raw else raw
payload = json.loads(line)
assert "error" not in payload, payload
result = payload["result"]
assert result["resultType"] == "complete", result
tools = {tool["name"]: tool for tool in result["tools"]}
invite = tools["invite_createInvite"]
expiration = invite["inputSchema"]["properties"]["expirationDate"]
assert expiration["type"] == "string", expiration
assert expiration.get("pattern"), expiration
print(json.dumps({"toolCount": len(tools), "inviteExpirationSchema": expiration}, sort_keys=True))
PY

request tools/call '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"invite_createInvite","arguments":{"expirationDate":"not-a-date"},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"verification","version":"1.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}' invite_createInvite >"$tmp_dir/invalid-invite.json"
python3 - "$tmp_dir/invalid-invite.json" <<'PY'
import json
import sys

raw = open(sys.argv[1], encoding="utf-8").read()
line = next(line[6:] for line in raw.splitlines() if line.startswith("data: ")) if "data: " in raw else raw
payload = json.loads(line)
assert "error" not in payload, payload
assert payload["result"]["isError"] is True, payload
print("invalid invite timestamp rejected")
PY

curl --fail-with-body --silent --show-error "$base_url/.well-known/oauth-authorization-server" >"$tmp_dir/oauth-root.json"
curl --fail-with-body --silent --show-error "$base_url/.well-known/oauth-protected-resource/api/mcp" >"$tmp_dir/oauth-resource.json"
python3 - "$tmp_dir/oauth-root.json" "$tmp_dir/oauth-resource.json" <<'PY'
import json
import sys

authorization = json.load(open(sys.argv[1], encoding="utf-8"))
resource = json.load(open(sys.argv[2], encoding="utf-8"))
assert authorization["issuer"].startswith("http://127.0.0.1:47576"), authorization
assert resource["resource"].startswith("http://127.0.0.1:47576"), resource
print("oauth metadata uses configured runtime origin")
PY

echo "MCP auth checks passed"
