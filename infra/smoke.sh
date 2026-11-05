#!/usr/bin/env bash
# End-to-end check of the deployed API (dev only: uses the dev email-code echo in Cloud Logging).
# Signs in a throwaway user through the real email-code flow, calls /v1/me and /v1/ai/ping,
# then deletes the user. Tokens and codes are never printed.
set -euo pipefail
# shellcheck source=infra/lib.sh
source "$(dirname "$0")/lib.sh"
load_env "${1:-}"
[[ "$ENV_NAME" == "dev" ]] || die "smoke.sh relies on dev email echo; dev only"

G=(gcloud --project="$PROJECT_ID" --quiet)
URL="$("${G[@]}" run services describe koach-api --region="$REGION" --format='value(status.url)')"
GS_JSON="$REPO_ROOT/apps/mobile/google-services.json"
API_KEY="$(node -e 'console.log(require(process.argv[1]).client[0].api_key[0].current_key)' "$GS_JSON")"
EMAIL="smoke-$(openssl rand -hex 4)@koach.test"
FAILED=0
row() { if [[ "$2" == "$3" ]]; then printf '  ✓ %s\n' "$1"; else printf '  ✗ %s (got %s, want %s)\n' "$1" "$2" "$3"; FAILED=1; fi; }
code_of() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json_field() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s)[process.argv[1]];process.stdout.write(v==null?"":String(v))})' "$1"; }

printf 'Smoke test %s\n' "$URL"
row "GET /healthz" "$(code_of "$URL/healthz")" 200
row "GET /v1/me without token" "$(code_of "$URL/v1/me")" 401
row "POST /v1/auth/email/start" "$(code_of -X POST -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\"}" "$URL/v1/auth/email/start")" 204

CODE=""
for _ in $(seq 1 20); do
  CODE="$("${G[@]}" logging read \
    "resource.type=\"cloud_run_revision\" AND jsonPayload.message=\"dev_email_code\" AND jsonPayload.email=\"$EMAIL\"" \
    --limit=1 --freshness=10m --format='value(jsonPayload.code)')"
  [[ -n "$CODE" ]] && break
  sleep 3
done
row "code found in logs" "$([[ -n "$CODE" ]] && echo yes || echo no)" yes

CUSTOM="$(curl -s -X POST -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}" "$URL/v1/auth/email/verify" | json_field customToken)"
row "POST /v1/auth/email/verify returns a custom token" "$([[ -n "$CUSTOM" ]] && echo yes || echo no)" yes

ID_TOKEN="$(curl -s -X POST -H 'content-type: application/json' \
  -d "{\"token\":\"$CUSTOM\",\"returnSecureToken\":true}" \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=$API_KEY" | json_field idToken)"
row "Firebase exchanges it for an ID token" "$([[ -n "$ID_TOKEN" ]] && echo yes || echo no)" yes
AUTH=(-H "Authorization: Bearer $ID_TOKEN")

row "GET /v1/me with token" "$(code_of "${AUTH[@]}" "$URL/v1/me")" 200
PING="$(curl -s "${AUTH[@]}" "$URL/v1/ai/ping")"
row "GET /v1/ai/ping returns text" "$([[ -n "$(printf '%s' "$PING" | json_field text)" ]] && echo yes || echo no)" yes
row "GET /v1/ai/ping returns audio" "$([[ -n "$(printf '%s' "$PING" | json_field audioBase64)" ]] && echo yes || echo no)" yes
row "GET /v1/me/export" "$(code_of "${AUTH[@]}" "$URL/v1/me/export")" 200
row "DELETE /v1/me" "$(code_of -X DELETE "${AUTH[@]}" "$URL/v1/me")" 204

exit "$FAILED"
