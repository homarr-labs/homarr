#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://100.111.30.70:3201}}"
SCREENSHOT_DIR="${2:-${SCREENSHOT_DIR:-.screenshots/ux-coherence-browser-agent}}"
BASE_URL="${BASE_URL%/}"

mkdir -p "$SCREENSHOT_DIR"
SCREENSHOT_DIR="$(cd "$SCREENSHOT_DIR" && pwd)"

SESSION="$(mise exec -- agent-browser session id --scope worktree --prefix ux-coherence)"
BOARD_NAME=""
BOARD_CREATE_REQUESTED=0
BOARD_CREATED=0
BOARD_CLEANUP_PENDING=0
API_KEY_CLEANUP_PENDING=0
API_KEY_CREATED_ID=""
CLEANUP_RAN=0
CLEANUP_DEADLINE=0
declare -a API_KEY_IDS_BEFORE=()
declare -A API_KEY_IDS_BEFORE_SET=()
API_KEY_IDS_BEFORE_JSON="[]"

ab() {
  mise exec -- agent-browser --session "$SESSION" "$@"
}

fail() {
  echo "ux-coherence browser assertion failed: $*" >&2
  exit 1
}

assert_count() {
  local selector="$1"
  local expected="$2"
  local message="$3"
  local actual

  actual="$(ab get count "$selector")"
  if [[ "$actual" != "$expected" ]]; then
    fail "$message (expected $expected, got $actual)"
  fi
}

assert_no_dialog() {
  local description="$1"

  assert_eval "(() => { const dialog = Array.from(document.querySelectorAll('[role=\"dialog\"]')).find((element) => element.offsetParent !== null); if (dialog) throw new Error('$description opened a visible dialog'); return true; })()"
}

assert_no_modal_dialog() {
  local description="$1"

  assert_eval "(() => { const modal = Array.from(document.querySelectorAll('[role=\"dialog\"][aria-modal=\"true\"]')).find((element) => element.offsetParent !== null); if (modal) throw new Error('$description opened a visible modal dialog'); return true; })()"
}

assert_eval() {
  local expression="$1"

  ab eval "$expression" >/dev/null
}

parse_api_key_ids() {
  local -n target="$1"
  local remaining="$2"
  local marker
  local id

  target=()
  while [[ "$remaining" =~ UX_COHERENCE_API_ID=([[:xdigit:]]{8}) ]]; do
    marker="${BASH_REMATCH[0]}"
    id="${BASH_REMATCH[1],,}"
    target+=("$id")
    remaining="${remaining#*"$marker"}"
  done
}

capture_api_key_ids() {
  local target_name="$1"
  local -n target="$target_name"
  local output
  local count

  output="$(ab eval "Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).map((button) => 'UX_COHERENCE_API_ID=' + button.closest('tr')?.querySelector('td')?.textContent?.trim()).join('\\n')")" || return
  count="$(ab get count 'button[aria-label="Delete API token"]')" || return
  if [[ ! "$count" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  parse_api_key_ids "$target_name" "$output"
  [[ "${#target[@]}" -eq "$count" ]]
}

capture_cleanup_api_key_ids() {
  local target_name="$1"
  local -n target="$target_name"
  local output
  local count

  output="$(cleanup_ab eval "Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).map((button) => 'UX_COHERENCE_API_ID=' + button.closest('tr')?.querySelector('td')?.textContent?.trim()).join('\\n')")" || return
  count="$(cleanup_ab get count 'button[aria-label="Delete API token"]')" || return
  if [[ ! "$count" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  parse_api_key_ids "$target_name" "$output"
  [[ "${#target[@]}" -eq "$count" ]]
}

api_key_ids_match_baseline() {
  local -n current="$1"
  local id

  if [[ "${#current[@]}" -ne "${#API_KEY_IDS_BEFORE[@]}" ]]; then
    return 1
  fi

  for id in "${current[@]}"; do
    if [[ -z "${API_KEY_IDS_BEFORE_SET[$id]+present}" ]]; then
      return 1
    fi
  done
}

api_key_ids_to_json() {
  local -n ids="$1"
  local separator=""
  local id

  printf '['
  for id in "${ids[@]}"; do
    printf '%s"%s"' "$separator" "$id"
    separator=","
  done
  printf ']'
}

capture() {
  local path="$1"

  # Development tooling is not part of Homarr and obscures the reviewed UI.
  ab eval "document.querySelectorAll('nextjs-portal, button[aria-label=\"Open TanStack Devtools\"]').forEach((element) => element.style.setProperty('display', 'none', 'important'))" >/dev/null
  ab screenshot --full "$path"
}

retry_action_until() {
  local action="$1"
  local condition="$2"
  local description="$3"
  local result

  for _ in {1..240}; do
    result="$(ab eval "$condition" 2>/dev/null || true)"
    if [[ "$result" == "true" ]]; then
      return
    fi

    ab eval "$action" >/dev/null 2>&1 || true
    ab wait 250 >/dev/null
  done

  fail "$description"
}

open_expandable() {
  local selector="$1"
  local description="$2"

  retry_action_until \
    "document.querySelector('$selector')?.click()" \
    "document.querySelector('$selector')?.getAttribute('aria-expanded') === 'true'" \
    "$description did not expand"
}

cleanup_ab() {
  local remaining=$((CLEANUP_DEADLINE - SECONDS))
  local command_timeout

  if ((remaining <= 0)); then
    return 124
  fi

  command_timeout="$remaining"
  if ((command_timeout > 10)); then
    command_timeout=10
  fi

  AGENT_BROWSER_DEFAULT_TIMEOUT="$((command_timeout * 1000))" \
    timeout --signal=TERM "${command_timeout}s" mise exec -- agent-browser --session "$SESSION" "$@"
}

cleanup_board_resource() {
  local opened

  if ((BOARD_CREATED)); then
    echo "Best-effort cleanup: confirmed board $BOARD_NAME" >&2
  else
    echo "Best-effort cleanup: board creation request for $BOARD_NAME" >&2
  fi
  cleanup_ab open "$BASE_URL/manage/boards" >/dev/null 2>&1 || return
  cleanup_ab wait --load domcontentloaded >/dev/null 2>&1 || return
  cleanup_ab wait --fn "document.querySelector('main') !== null" >/dev/null 2>&1 || return
  opened="$(cleanup_ab eval "(() => { const card = Array.from(document.querySelectorAll('main .mantine-Card-root')).find((item) => item.querySelector('a[href=\"/boards/$BOARD_NAME\"]')); if (!card) return false; const settings = card.querySelector('button[aria-label=\"Settings\"]'); if (!settings) throw new Error('Board settings button was not found'); settings.click(); return true; })()" 2>/dev/null)" || return
  if [[ "$opened" != "true" ]]; then
    BOARD_CLEANUP_PENDING=0
    BOARD_CREATED=0
    return
  fi

  cleanup_ab wait --fn "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((item) => item.offsetParent !== null && item.textContent?.trim() === 'Delete')" >/dev/null 2>&1 || return
  cleanup_ab eval "(() => { const item = Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Delete'); if (!item) throw new Error('Board Delete action was not found'); item.click(); return true; })()" >/dev/null 2>&1 || return
  cleanup_ab wait --fn "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((item) => item.offsetParent !== null && item.textContent?.trim() === 'Confirm')" >/dev/null 2>&1 || return
  cleanup_ab eval "(() => { const item = Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Confirm'); if (!item) throw new Error('Board Confirm action was not found'); item.click(); return true; })()" >/dev/null 2>&1 || return
  cleanup_ab wait --fn "!document.body.innerText.includes('$BOARD_NAME')" >/dev/null 2>&1 || return
  BOARD_CLEANUP_PENDING=0
  BOARD_CREATED=0
}

cleanup_api_key_resources() {
  local id
  local -a current_ids=()
  local -a created_ids=()
  local -a remaining_ids=()

  echo "Best-effort cleanup: API keys created after the captured baseline" >&2
  cleanup_ab open "$BASE_URL/manage/tools/api" >/dev/null 2>&1 || return
  cleanup_ab wait --load domcontentloaded >/dev/null 2>&1 || return
  cleanup_ab wait --fn "Array.from(document.querySelectorAll('[role=\"tab\"]')).some((item) => item.textContent?.trim() === 'Authentication')" >/dev/null 2>&1 || return
  cleanup_ab eval "Array.from(document.querySelectorAll('[role=\"tab\"]')).find((item) => item.textContent?.trim() === 'Authentication')?.click()" >/dev/null 2>&1 || return
  cleanup_ab wait --fn "Array.from(document.querySelectorAll('h1, h2, h3')).some((heading) => heading.offsetParent !== null && heading.textContent?.trim() === 'API Keys')" >/dev/null 2>&1 || return
  capture_cleanup_api_key_ids current_ids || return

  if [[ -n "$API_KEY_CREATED_ID" ]]; then
    for id in "${current_ids[@]}"; do
      if [[ "$id" == "$API_KEY_CREATED_ID" ]]; then
        created_ids+=("$id")
      fi
    done
  else
    for id in "${current_ids[@]}"; do
      if [[ -z "${API_KEY_IDS_BEFORE_SET[$id]+present}" ]]; then
        created_ids+=("$id")
      fi
    done
  fi

  for id in "${created_ids[@]}"; do
    cleanup_ab eval "(() => { const id = '$id'; const button = Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).find((item) => item.closest('tr')?.querySelector('td')?.textContent?.trim().toLowerCase() === id); if (!button) throw new Error('Created API key row was not found'); button.click(); return true; })()" >/dev/null 2>&1 || return
    cleanup_ab wait --fn "(() => { const id = '$id'; const row = Array.from(document.querySelectorAll('tr')).find((item) => item.querySelector('td')?.textContent?.trim().toLowerCase() === id); return row?.querySelector('button[aria-label=\"Confirm\"]')?.offsetParent !== null; })()" >/dev/null 2>&1 || return
    cleanup_ab eval "(() => { const id = '$id'; const row = Array.from(document.querySelectorAll('tr')).find((item) => item.querySelector('td')?.textContent?.trim().toLowerCase() === id); const button = row?.querySelector('button[aria-label=\"Confirm\"]'); if (!button) throw new Error('Created API key Confirm action was not found'); button.click(); return true; })()" >/dev/null 2>&1 || return
    cleanup_ab wait --fn "!Array.from(document.querySelectorAll('tr')).some((item) => item.querySelector('td')?.textContent?.trim().toLowerCase() === '$id')" >/dev/null 2>&1 || return
  done

  capture_cleanup_api_key_ids remaining_ids || return
  if api_key_ids_match_baseline remaining_ids; then
    API_KEY_CLEANUP_PENDING=0
    API_KEY_CREATED_ID=""
  fi
}

cleanup() {
  local exit_code=$?

  if ((CLEANUP_RAN)); then
    exit "$exit_code"
  fi

  CLEANUP_RAN=1
  trap - EXIT INT TERM
  set +e
  CLEANUP_DEADLINE=$((SECONDS + 45))

  if ((API_KEY_CLEANUP_PENDING)); then
    cleanup_api_key_resources
  fi
  if ((BOARD_CLEANUP_PENDING && BOARD_CREATE_REQUESTED)); then
    cleanup_board_resource
  fi

  # Closing the session is always the final browser operation.
  timeout --signal=TERM 5s mise exec -- agent-browser --session "$SESSION" close >/dev/null 2>&1
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Browser session: $SESSION"
echo "Base URL: $BASE_URL"
echo "Screenshots: $SCREENSHOT_DIR"

# The first command launches Chromium. This host requires the sandbox override.
ab --args "--no-sandbox" open "$BASE_URL"
ab wait --load domcontentloaded
ab set viewport 1440 1000
ab set media light reduced-motion
ab wait --fn "window.location.pathname.includes('/auth/login') || document.querySelector('button[aria-label=\"Edit board\"]') !== null" --timeout 120000

current_url="$(ab get url)"
if [[ "$current_url" == *"/auth/login"* ]]; then
  # These credentials are visibly documented by the writable demo login page.
  ab wait --text "Demo mode is enabled"
  ab wait --fn "(() => { const input = document.querySelector('input[name=\"username\"]'); return input !== null && Object.keys(input).some((key) => key.startsWith('__reactProps$')); })()" --timeout 120000
  ab snapshot -i
  ab find label "Username" fill "demo" --exact
  ab find label "Password" fill "demo" --exact
  ab find role button click --name "Login" --exact
  ab wait --fn "!window.location.pathname.includes('/auth/login')" --timeout 120000
  ab snapshot -i
fi

current_url="$(ab get url)"
if [[ "$current_url" == *"/auth/login"* ]]; then
  fail "demo login did not leave the login page"
fi

navigate() {
  local path="$1"

  ab open "$BASE_URL$path"
  ab wait --load domcontentloaded
  ab snapshot -i
}

echo "[1/5] Weather dimensions popover"
navigate "/widgets/weather"
ab wait 'button[aria-label="Change dimensions"]' --timeout 120000
open_expandable 'button[aria-label="Change dimensions"]' "Weather dimensions popover"
ab wait --text "Width"
ab snapshot -i
# Mantine gives non-modal popovers a dialog role; verify that no modal shell opened.
assert_no_modal_dialog "Weather dimensions popover"
capture "$SCREENSHOT_DIR/01-weather-dimensions-popover.png"
assert_eval "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Cancel'); if (!button) throw new Error('Weather dimensions Cancel button was not found'); button.click(); return true; })()"
ab snapshot -i

echo "[2/5] Board creation and inline cleanup"
BOARD_NAME="ux-$(date +%Y%m%d%H%M%S)-$BASHPID"
navigate "/manage/boards"
ab wait --fn "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'New board'); return button !== undefined && Object.keys(button).some((key) => key.startsWith('__reactProps$')); })()" --timeout 120000
ab find role button click --name "New board" --exact
ab wait --fn "Array.from(document.querySelectorAll('input')).some((input) => input.getAttribute('aria-label') === 'Name' || input.labels?.[0]?.textContent?.trim().startsWith('Name'))" --timeout 120000
assert_no_modal_dialog "Board creation form"
ab snapshot -i
ab find role textbox fill "$BOARD_NAME" --name "Name" --exact
ab wait --text "$BOARD_NAME is available"
ab snapshot -i
assert_eval "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Create'); if (!button || button.disabled) throw new Error('Create board button is not enabled'); return true; })()"
capture "$SCREENSHOT_DIR/02-board-inline-create.png"
BOARD_CREATE_REQUESTED=1
BOARD_CLEANUP_PENDING=1
assert_eval "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Create'); if (!button || button.disabled) throw new Error('Create board button is not enabled'); button.click(); return true; })()"
ab wait --url "**/boards/$BOARD_NAME*" --timeout 120000
BOARD_CREATED=1
ab snapshot -i

navigate "/manage/boards"
ab wait --text "$BOARD_NAME"
retry_action_until \
  "(() => { const card = Array.from(document.querySelectorAll('main .mantine-Card-root')).find((item) => item.querySelector('a[href=\"/boards/$BOARD_NAME\"]')); const settings = card?.querySelector('button[aria-label=\"Settings\"]'); settings?.scrollIntoView({ block: 'center' }); if (settings?.getAttribute('aria-expanded') !== 'true') settings?.click(); })()" \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((element) => element.offsetParent !== null && element.textContent?.trim() === 'Delete')" \
  "Created board actions did not open"
ab snapshot -i
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Delete')?.click()" \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((element) => element.offsetParent !== null && element.textContent?.trim() === 'Confirm')" \
  "Board Delete action did not enter confirmation state"
ab snapshot -i
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Confirm')?.click()" \
  "!document.body.innerText.includes('$BOARD_NAME')" \
  "Created board still exists after cleanup"
ab snapshot -i
assert_eval "(() => { if (document.body.innerText.includes('$BOARD_NAME')) throw new Error('Created board still exists after cleanup'); return true; })()"
BOARD_CLEANUP_PENDING=0
BOARD_CREATED=0

echo "[3/5] Calendar inline removal and reload restore"
navigate "/"
ab wait '[data-kind="calendar"]' --timeout 120000
if [[ "$(ab get count 'button[aria-label="Edit board"]')" == "1" ]]; then
  retry_action_until \
    "document.querySelector('button[aria-label=\"Edit board\"]')?.click()" \
    "document.querySelector('button[aria-label=\"Settings for Calendar\"]') !== null" \
    "Board did not enter edit mode"
  ab snapshot -i
fi
ab hover '[data-kind="calendar"]'
ab wait --fn "(() => { const button = document.querySelector('button[aria-label=\"Settings for Calendar\"]'); return button !== null && button.offsetParent !== null; })()" --timeout 120000
ab snapshot -i
retry_action_until \
  "document.querySelector('button[aria-label=\"Settings for Calendar\"]')?.click()" \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((element) => element.offsetParent !== null && element.textContent?.trim() === 'Remove item')" \
  "Calendar actions did not open"
ab snapshot -i
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Remove item')?.click()" \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).some((element) => element.offsetParent !== null && element.textContent?.trim() === 'Are you sure?')" \
  "Calendar removal did not enter confirmation state"
ab snapshot -i
assert_no_dialog "Calendar removal confirmation"
capture "$SCREENSHOT_DIR/03-calendar-inline-remove-confirmation.png"
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"menuitem\"]')).find((element) => element.offsetParent !== null && element.textContent?.trim() === 'Are you sure?')?.click()" \
  "document.querySelector('[data-kind=\"calendar\"]') === null" \
  "Calendar item was not removed"
ab snapshot -i
ab reload
ab wait --load domcontentloaded
ab wait '[data-kind="calendar"]'
ab snapshot -i
assert_count '[data-kind="calendar"]' 1 "Calendar item was not restored by reloading without Save"

echo "[4/5] API token inline creation and exact-row cleanup"
navigate "/manage/tools/api"
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"tab\"]')).find((element) => element.textContent?.trim() === 'Authentication')?.click()" \
  "Array.from(document.querySelectorAll('h1, h2, h3')).some((heading) => heading.offsetParent !== null && heading.textContent?.trim() === 'API Keys')" \
  "Authentication tab did not open"
ab snapshot -i
capture_api_key_ids API_KEY_IDS_BEFORE || fail "Could not capture the pre-create API key IDs"
API_KEY_IDS_BEFORE_SET=()
for api_key_id in "${API_KEY_IDS_BEFORE[@]}"; do
  API_KEY_IDS_BEFORE_SET["$api_key_id"]=1
done
API_KEY_IDS_BEFORE_JSON="$(api_key_ids_to_json API_KEY_IDS_BEFORE)"
API_KEY_CLEANUP_PENDING=1
ab wait --fn "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Create API token'); return button !== undefined && !button.disabled && Object.keys(button).some((key) => key.startsWith('__reactProps$')); })()" --timeout 120000
ab find role button click --name "Create API token" --exact
ab wait --text "API token created" --timeout 120000
ab snapshot -i -s "table"
assert_eval "(() => { const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Create API token'); if (!button?.disabled) throw new Error('Create API token is not disabled while the new token is visible'); return true; })()"
assert_no_dialog "API token creation result"
# The token stays masked; do not snapshot, reveal, copy, or read the secret alert.
capture "$SCREENSHOT_DIR/04-api-token-created-inline.png"
retry_action_until \
  "Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Close' && item.offsetParent !== null)?.click()" \
  "!document.body.innerText.includes('API token created')" \
  "API token result did not close"
ab snapshot -i
ab reload
ab wait --load domcontentloaded
retry_action_until \
  "Array.from(document.querySelectorAll('[role=\"tab\"]')).find((element) => element.textContent?.trim() === 'Authentication')?.click()" \
  "Array.from(document.querySelectorAll('h1, h2, h3')).some((heading) => heading.offsetParent !== null && heading.textContent?.trim() === 'API Keys')" \
  "Authentication tab did not reopen after refreshing API keys"
ab wait --fn "(() => { const previous = new Set($API_KEY_IDS_BEFORE_JSON); const created = Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).map((button) => button.closest('tr')?.querySelector('td')?.textContent?.trim().toLowerCase()).filter(Boolean).filter((id) => !previous.has(id)); return created.length === 1; })()" --timeout 120000
ab snapshot -i
declare -a API_KEY_IDS_AFTER_CREATE=()
capture_api_key_ids API_KEY_IDS_AFTER_CREATE || fail "Could not capture the post-create API key IDs"
for api_key_id in "${API_KEY_IDS_AFTER_CREATE[@]}"; do
  if [[ -z "${API_KEY_IDS_BEFORE_SET[$api_key_id]+present}" ]]; then
    if [[ -n "$API_KEY_CREATED_ID" ]]; then
      fail "More than one API key appeared after creation"
    fi
    API_KEY_CREATED_ID="$api_key_id"
  fi
done
if [[ -z "$API_KEY_CREATED_ID" ]]; then
  fail "Could not identify the newly created API token row"
fi
assert_eval "(() => { const id = '$API_KEY_CREATED_ID'; const button = Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).find((item) => item.closest('tr')?.querySelector('td')?.textContent?.trim().toLowerCase() === id); if (!button) throw new Error('Created API key row was not found'); button.setAttribute('aria-label', 'Delete created API token'); return true; })()"
ab find role button click --name "Delete created API token" --exact
ab wait --fn "document.querySelector('button[aria-label=\"Confirm\"]')?.offsetParent !== null"
ab snapshot -i
assert_no_dialog "API token deletion confirmation"
capture "$SCREENSHOT_DIR/05-api-token-inline-delete-confirmation.png"
ab find role button click --name "Confirm" --exact
ab wait --fn "!Array.from(document.querySelectorAll('tr')).some((item) => item.querySelector('td')?.textContent?.trim().toLowerCase() === '$API_KEY_CREATED_ID')" --timeout 120000
ab snapshot -i
assert_eval "(() => { const previous = new Set($API_KEY_IDS_BEFORE_JSON); const current = Array.from(document.querySelectorAll('button[aria-label=\"Delete API token\"]')).map((button) => button.closest('tr')?.querySelector('td')?.textContent?.trim().toLowerCase()).filter(Boolean); if (current.length !== previous.size || current.some((id) => !previous.has(id))) throw new Error('New API token row still exists after cleanup'); return true; })()"
capture "$SCREENSHOT_DIR/06-api-token-cleaned-up.png"
declare -a API_KEY_IDS_AFTER_CLEANUP=()
capture_api_key_ids API_KEY_IDS_AFTER_CLEANUP || fail "Could not verify API key cleanup"
api_key_ids_match_baseline API_KEY_IDS_AFTER_CLEANUP || fail "API key cleanup did not restore the pre-create IDs"
API_KEY_CLEANUP_PENDING=0
API_KEY_CREATED_ID=""

echo "[5/5] Certificate upload inline expansion"
navigate "/manage/tools/certificates"
retry_action_until \
  "Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Add certificate' && item.getAttribute('aria-expanded') === 'false')?.click()" \
  "Array.from(document.querySelectorAll('button')).some((item) => item.textContent?.trim() === 'Add certificate' && item.getAttribute('aria-expanded') === 'true')" \
  "Add certificate section did not expand"
ab snapshot -i
assert_no_dialog "Add certificate section"
capture "$SCREENSHOT_DIR/07-certificate-upload-inline.png"
retry_action_until \
  "Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Cancel' && item.offsetParent !== null)?.click()" \
  "Array.from(document.querySelectorAll('button')).some((item) => item.textContent?.trim() === 'Add certificate' && item.getAttribute('aria-expanded') === 'false')" \
  "Add certificate section did not close"
ab snapshot -i

echo "UX coherence happy paths passed. Screenshots remain in $SCREENSHOT_DIR"
