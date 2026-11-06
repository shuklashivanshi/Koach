#!/usr/bin/env bash
# Creates every GCP + Firebase resource Koach needs for one environment.
# Idempotent: safe to re-run; existing resources are left alone.
# Prerequisites (done by the user, see README): billing account, `gcloud auth login`,
# `gcloud auth application-default login`, Firebase CLI login, Resend API key at hand.
set -euo pipefail
# shellcheck source=infra/lib.sh
source "$(dirname "$0")/lib.sh"
load_env "${1:-}"

[[ -n "$BILLING_ACCOUNT" ]] || die "set BILLING_ACCOUNT in $ENV_FILE"
command -v gcloud >/dev/null || die "gcloud not installed"

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="koach-${ENV_NAME}-$(openssl rand -hex 3)"
  set_env_value PROJECT_ID "$PROJECT_ID"
  log "generated project id $PROJECT_ID"
fi
G=(gcloud --project="$PROJECT_ID" --quiet)

# --- Project and billing -----------------------------------------------------------------------
step "project $PROJECT_ID" gcloud projects describe "$PROJECT_ID" -- \
  gcloud projects create "$PROJECT_ID" --name="Koach ${ENV_NAME}"
billing_linked() { [[ "$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)')" == "True" ]]; }
step "billing link" billing_linked -- \
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

# --- APIs --------------------------------------------------------------------------------------
APIS=(run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com
  cloudbuild.googleapis.com secretmanager.googleapis.com aiplatform.googleapis.com
  texttospeech.googleapis.com speech.googleapis.com storage.googleapis.com iam.googleapis.com
  iamcredentials.googleapis.com cloudscheduler.googleapis.com pubsub.googleapis.com
  billingbudgets.googleapis.com firebase.googleapis.com identitytoolkit.googleapis.com
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com)
log "enabling APIs (no-op for ones already enabled)"
"${G[@]}" services enable "${APIS[@]}"

# --- Artifact Registry -------------------------------------------------------------------------
step "artifact registry $AR_REPO" "${G[@]}" artifacts repositories describe "$AR_REPO" --location="$REGION" -- \
  retry "${G[@]}" artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION"

# --- Service accounts and roles ------------------------------------------------------------------
sa_email() { printf '%s@%s.iam.gserviceaccount.com' "$1" "$PROJECT_ID"; }
for sa in koach-api koach-jobs koach-build; do
  step "service account $sa" "${G[@]}" iam service-accounts describe "$(sa_email "$sa")" -- \
    "${G[@]}" iam service-accounts create "$sa" --display-name="$sa"
done
bind() { retry "${G[@]}" projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$(sa_email "$1")" --role="$2" --condition=None >/dev/null; }
log "granting roles"
for role in roles/cloudsql.client roles/aiplatform.user roles/secretmanager.secretAccessor \
  roles/speech.client roles/firebaseauth.admin roles/serviceusage.serviceUsageConsumer roles/logging.logWriter; do
  bind koach-api "$role"
done
for role in roles/cloudsql.client roles/aiplatform.user roles/secretmanager.secretAccessor \
  roles/logging.logWriter; do
  bind koach-jobs "$role"
done
for role in roles/run.admin roles/artifactregistry.writer roles/logging.logWriter \
  roles/storage.objectViewer roles/cloudbuild.builds.builder; do
  bind koach-build "$role"
done
# Cloud Run needs koach-api to sign Firebase custom tokens with its own identity.
retry "${G[@]}" iam service-accounts add-iam-policy-binding "$(sa_email koach-api)" \
  --member="serviceAccount:$(sa_email koach-api)" --role=roles/iam.serviceAccountTokenCreator >/dev/null
# The build deploys services and jobs that run as these accounts.
for sa in koach-api koach-jobs; do
  retry "${G[@]}" iam service-accounts add-iam-policy-binding "$(sa_email "$sa")" \
    --member="serviceAccount:$(sa_email koach-build)" --role=roles/iam.serviceAccountUser >/dev/null
done
# The Cloud Build service agent stores the GitHub connection token in Secret Manager (trigger.sh).
PROJECT_NUMBER="$("${G[@]}" projects describe "$PROJECT_ID" --format='value(projectNumber)')"
"${G[@]}" beta services identity create --service=cloudbuild.googleapis.com >/dev/null 2>&1 || true
retry "${G[@]}" projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
  --role=roles/secretmanager.admin --condition=None >/dev/null

# --- Cloud SQL ----------------------------------------------------------------------------------
step "cloud sql $SQL_INSTANCE" "${G[@]}" sql instances describe "$SQL_INSTANCE" -- \
  "${G[@]}" sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 --edition=ENTERPRISE \
  --tier="$SQL_TIER" --region="$REGION" --storage-size=10 --storage-auto-increase \
  --backup-start-time=20:30
step "database $DB_NAME" "${G[@]}" sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" -- \
  "${G[@]}" sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"

secret_exists() { "${G[@]}" secrets describe "$1" >/dev/null 2>&1; }
# The DB password never leaves this process: generated, set on the user, piped into Secret Manager.
if secret_exists DATABASE_URL; then
  log "exists   secret DATABASE_URL"
else
  log "creating db user $DB_USER + secret DATABASE_URL"
  DB_PASSWORD="$(openssl rand -hex 24)"
  if "${G[@]}" sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
    "${G[@]}" sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
  else
    "${G[@]}" sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" >/dev/null
  fi
  printf 'postgresql://%s:%s@/%s?host=/cloudsql/%s:%s:%s' "$DB_USER" "$DB_PASSWORD" "$DB_NAME" \
    "$PROJECT_ID" "$REGION" "$SQL_INSTANCE" |
    "${G[@]}" secrets create DATABASE_URL --replication-policy=automatic --data-file=- >/dev/null
  unset DB_PASSWORD
fi

# --- Other secrets ------------------------------------------------------------------------------
create_project_id_secret() {
  printf '%s' "$PROJECT_ID" | "${G[@]}" secrets create FIREBASE_PROJECT_ID --replication-policy=automatic --data-file=- >/dev/null
}
step "secret FIREBASE_PROJECT_ID" secret_exists FIREBASE_PROJECT_ID -- create_project_id_secret
if secret_exists RESEND_API_KEY; then
  log "exists   secret RESEND_API_KEY"
else
  # Non-interactive runs may pass the key via RESEND_API_KEY_INPUT; otherwise prompt (hidden).
  RESEND_KEY="${RESEND_API_KEY_INPUT:-}"
  if [[ -z "$RESEND_KEY" ]]; then
    read -r -s -p "Paste the Resend API key (input hidden): " RESEND_KEY
    printf '\n'
  fi
  [[ -n "$RESEND_KEY" ]] || die "empty Resend key"
  printf '%s' "$RESEND_KEY" | "${G[@]}" secrets create RESEND_API_KEY --replication-policy=automatic --data-file=- >/dev/null
  unset RESEND_KEY
  log "created  secret RESEND_API_KEY"
fi

# --- Storage ------------------------------------------------------------------------------------
BUCKET="${PROJECT_ID}-user-data"
step "bucket gs://$BUCKET" "${G[@]}" storage buckets describe "gs://$BUCKET" -- \
  "${G[@]}" storage buckets create "gs://$BUCKET" --location="$REGION" \
  --uniform-bucket-level-access --public-access-prevention
retry "${G[@]}" storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$(sa_email koach-api)" --role=roles/storage.objectAdmin >/dev/null

# --- Budget -------------------------------------------------------------------------------------
budget_exists() {
  gcloud billing budgets list --billing-project="$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --format='value(displayName)' |
    grep -qx "$PROJECT_ID"
}
step "budget ${BUDGET_AMOUNT} ${BUDGET_CURRENCY}" budget_exists -- \
  gcloud billing budgets create --billing-project="$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --display-name="$PROJECT_ID" \
  --budget-amount="${BUDGET_AMOUNT}${BUDGET_CURRENCY}" --filter-projects="projects/$PROJECT_ID" \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

# --- Firebase -----------------------------------------------------------------------------------
firebase_enabled() { firebase_cli projects:list --json | grep -q "\"projectId\": \"$PROJECT_ID\""; }
step "firebase on $PROJECT_ID" firebase_enabled -- firebase_cli projects:addfirebase "$PROJECT_ID"
android_app_id() {
  firebase_cli apps:list ANDROID --project "$PROJECT_ID" --json |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=(JSON.parse(s).result||[]).find(x=>x.packageName===process.argv[1]);if(!a)process.exit(1);console.log(a.appId)})' "$ANDROID_PACKAGE"
}
step "firebase android app $ANDROID_PACKAGE" android_app_id -- \
  firebase_cli apps:create ANDROID "Koach" --package-name="$ANDROID_PACKAGE" --project "$PROJECT_ID"
GS_JSON="$REPO_ROOT/apps/mobile/google-services.json"
mkdir -p "$(dirname "$GS_JSON")"
firebase_cli apps:sdkconfig ANDROID "$(android_app_id)" --project "$PROJECT_ID" --out "$GS_JSON" >/dev/null
log "wrote    apps/mobile/google-services.json (gitignored)"

# The web OAuth client appears in google-services.json once the Google provider is enabled.
WEB_CLIENT_ID="$(node -e 'const j=require(process.argv[1]);const c=(j.client?.[0]?.oauth_client||[]).find(o=>o.client_type===3);if(c)console.log(c.client_id)' "$GS_JSON")"
if [[ -n "$WEB_CLIENT_ID" ]]; then
  set_env_value GOOGLE_WEB_CLIENT_ID "$WEB_CLIENT_ID"
  log "recorded GOOGLE_WEB_CLIENT_ID"
else
  log "ACTION   enable Google in Firebase console → Authentication → Sign-in method, then re-run"
fi

log "done. Run: infra/verify.sh $ENV_NAME"
