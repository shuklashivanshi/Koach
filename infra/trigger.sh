#!/usr/bin/env bash
# Links the GitHub repo to Cloud Build (2nd-gen connection) and creates the push-to-main trigger.
# Prerequisite: the user approved the Cloud Build GitHub App (see README "CI/CD").
set -euo pipefail
# shellcheck source=infra/lib.sh
source "$(dirname "$0")/lib.sh"
load_env "${1:-}"
[[ -n "$PROJECT_ID" ]] || die "PROJECT_ID not set; run bootstrap first"
[[ -n "$GITHUB_REPO_URL" ]] || die "set GITHUB_REPO_URL in $ENV_FILE"

G=(gcloud --project="$PROJECT_ID" --quiet)
CONNECTION=koach-gh
REPO=koach
TRIGGER="koach-${ENV_NAME}-main"
BUILD_SA="projects/$PROJECT_ID/serviceAccounts/koach-build@$PROJECT_ID.iam.gserviceaccount.com"

connection_ready() {
  [[ "$("${G[@]}" builds connections describe "$CONNECTION" --region="$REGION" \
    --format='value(installationState.stage)' 2>/dev/null)" == "COMPLETE" ]]
}
if ! "${G[@]}" builds connections describe "$CONNECTION" --region="$REGION" >/dev/null 2>&1; then
  log "creating connection $CONNECTION; open the URL it prints and approve access to the repo only"
  "${G[@]}" builds connections create github "$CONNECTION" --region="$REGION"
fi
connection_ready || die "connection $CONNECTION not approved yet; finish the browser step and re-run"

step "repository $REPO" "${G[@]}" builds repositories describe "$REPO" --connection="$CONNECTION" --region="$REGION" -- \
  "${G[@]}" builds repositories create "$REPO" --remote-uri="$GITHUB_REPO_URL" \
  --connection="$CONNECTION" --region="$REGION"

APP_ENV=dev; ECHO=1
[[ "$ENV_NAME" == "prod" ]] && { APP_ENV=prod; ECHO=0; }
step "trigger $TRIGGER" "${G[@]}" builds triggers describe "$TRIGGER" --region="$REGION" -- \
  "${G[@]}" builds triggers create github --name="$TRIGGER" --region="$REGION" \
  --repository="projects/$PROJECT_ID/locations/$REGION/connections/$CONNECTION/repositories/$REPO" \
  --branch-pattern='^main$' --build-config=deploy.yaml --service-account="$BUILD_SA" \
  --substitutions="_ENV=${ENV_NAME},_APP_ENV=${APP_ENV},_EMAIL_DEV_ECHO=${ECHO}"

log "done: pushes to main now run deploy.yaml in $PROJECT_ID"
