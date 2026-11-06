#!/usr/bin/env bash
# Shared helpers for infra scripts. Sourced, not executed.
# shellcheck disable=SC2034  # variables are used by the scripts that source this file
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"
FIREBASE_TOOLS_VERSION="15.34.1"

log() { printf '\033[2m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

firebase_cli() { pnpm dlx "firebase-tools@${FIREBASE_TOOLS_VERSION}" "$@"; }

load_env() {
  local env="${1:-}"
  [[ -n "$env" ]] || die "usage: $0 <env>   (e.g. dev)"
  ENV_FILE="$INFRA_DIR/env/$env.env"
  [[ -f "$ENV_FILE" ]] || die "missing $ENV_FILE"
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  ENV_NAME="$env"
}

# Writes KEY=value into the env file (non-secret values only).
set_env_value() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

# step "description" <check command...> -- <create command...>
# Runs the create command only when the check command fails, so every step is idempotent.
step() {
  local desc="$1"; shift
  local check=() create=()
  while [[ $# -gt 0 && "$1" != "--" ]]; do check+=("$1"); shift; done
  shift
  create=("$@")
  if "${check[@]}" >/dev/null 2>&1; then
    log "exists   $desc"
  else
    log "creating $desc"
    "${create[@]}"
  fi
}

# Runs a command, retrying with backoff. IAM policy edits conflict (ETag mismatch) when several
# land back to back, and newly enabled APIs can take a minute to accept requests.
retry() {
  local attempt=1 max=6
  until "$@"; do
    (( attempt >= max )) && return 1
    log "retrying in $((attempt * 5))s: $1 $2 $3"
    sleep $((attempt * 5))
    attempt=$((attempt + 1))
  done
}

