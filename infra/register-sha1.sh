#!/usr/bin/env bash
# Registers the EAS Android signing certificate's SHA-1 with the Firebase Android app, which
# Google Sign-In requires. Find the SHA-1 at expo.dev → project → Credentials → Android, or in
# the output of `eas credentials --platform android`.
#   infra/register-sha1.sh dev AA:BB:...:99
set -euo pipefail
# shellcheck source=infra/lib.sh
source "$(dirname "$0")/lib.sh"
load_env "${1:-}"
SHA1="${2:-}"
[[ "$SHA1" =~ ^([0-9A-Fa-f]{2}:){19}[0-9A-Fa-f]{2}$ ]] || die "usage: $0 <env> <SHA-1 as AA:BB:...>"

APP_ID="$(firebase_cli apps:list ANDROID --project "$PROJECT_ID" --json |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=(JSON.parse(s).result||[]).find(x=>x.packageName===process.argv[1]);if(!a)process.exit(1);console.log(a.appId)})' "$ANDROID_PACKAGE")"
existing="$(firebase_cli apps:android:sha:list "$APP_ID" --project "$PROJECT_ID" 2>/dev/null || true)"
NORMALISED="$(printf '%s' "$SHA1" | tr -d ':' | tr '[:upper:]' '[:lower:]')"
if printf '%s' "$existing" | tr -d ':' | tr '[:upper:]' '[:lower:]' | grep -q "$NORMALISED"; then
  log "exists   SHA-1 on $APP_ID"
else
  firebase_cli apps:android:sha:create "$APP_ID" "$SHA1" --project "$PROJECT_ID"
  log "added    SHA-1 on $APP_ID"
fi
# Re-download config so the Android OAuth client for this SHA-1 is included.
rm -f "$REPO_ROOT/apps/mobile/google-services.json" # the CLI refuses to overwrite
firebase_cli apps:sdkconfig ANDROID "$APP_ID" --project "$PROJECT_ID" --out "$REPO_ROOT/apps/mobile/google-services.json" >/dev/null
log "refreshed apps/mobile/google-services.json"
