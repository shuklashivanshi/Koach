#!/usr/bin/env bash
# Read-only check that every resource bootstrap.sh creates exists. Exits 1 on any gap.
set -euo pipefail
# shellcheck source=infra/lib.sh
source "$(dirname "$0")/lib.sh"
load_env "${1:-}"
[[ -n "$PROJECT_ID" ]] || die "PROJECT_ID not set; run bootstrap first"

G=(gcloud --project="$PROJECT_ID" --quiet)
FAILED=0
check() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then printf '  ✓ %s\n' "$desc"; else printf '  ✗ %s\n' "$desc"; FAILED=1; fi
}
sa() { "${G[@]}" iam service-accounts describe "$1@$PROJECT_ID.iam.gserviceaccount.com"; }
api_on() { "${G[@]}" services list --enabled --format='value(config.name)' | grep -qx "$1"; }
has_role() {
  "${G[@]}" projects get-iam-policy "$PROJECT_ID" --flatten='bindings[].members' \
    --filter="bindings.role=$2 AND bindings.members=serviceAccount:$1@$PROJECT_ID.iam.gserviceaccount.com" \
    --format='value(bindings.role)' | grep -q .
}
sql_version() { [[ "$("${G[@]}" sql instances describe "$SQL_INSTANCE" --format='value(databaseVersion)')" == "POSTGRES_16" ]]; }
sql_region() { [[ "$("${G[@]}" sql instances describe "$SQL_INSTANCE" --format='value(region)')" == "$REGION" ]]; }
billing() { [[ "$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)')" == "True" ]]; }
budget() { gcloud billing budgets list --billing-project="$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --format='value(displayName)' | grep -qx "$PROJECT_ID"; }
web_client() { [[ -n "$GOOGLE_WEB_CLIENT_ID" ]]; }
gs_json() { [[ -f "$REPO_ROOT/apps/mobile/google-services.json" ]]; }

printf 'Koach %s (%s)\n' "$ENV_NAME" "$PROJECT_ID"
check "project exists" gcloud projects describe "$PROJECT_ID"
check "billing enabled" billing
for api in run.googleapis.com sqladmin.googleapis.com aiplatform.googleapis.com \
  texttospeech.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firebase.googleapis.com identitytoolkit.googleapis.com; do
  check "api $api" api_on "$api"
done
check "artifact registry $AR_REPO ($REGION)" "${G[@]}" artifacts repositories describe "$AR_REPO" --location="$REGION"
for s in koach-api koach-jobs koach-build; do check "service account $s" sa "$s"; done
check "koach-api has cloudsql.client" has_role koach-api roles/cloudsql.client
check "koach-api has aiplatform.user" has_role koach-api roles/aiplatform.user
check "koach-build has run.admin" has_role koach-build roles/run.admin
check "cloud sql $SQL_INSTANCE is POSTGRES_16" sql_version
check "cloud sql in $REGION" sql_region
check "database $DB_NAME" "${G[@]}" sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE"
for s in DATABASE_URL FIREBASE_PROJECT_ID RESEND_API_KEY; do
  check "secret $s" "${G[@]}" secrets describe "$s"
done
check "bucket gs://${PROJECT_ID}-user-data" "${G[@]}" storage buckets describe "gs://${PROJECT_ID}-user-data"
check "budget ${BUDGET_AMOUNT} ${BUDGET_CURRENCY}" budget
check "google-services.json present" gs_json
check "Google sign-in enabled (web client id recorded)" web_client

exit "$FAILED"
