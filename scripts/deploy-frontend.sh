#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-root@yxorp.app}"
SITE_DIR="/var/yxorp-sites/app.gl0be.co"
RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$$"
STAGING_DIR="/var/yxorp-sites/.gl0be-$RELEASE"
BACKUP_DIR="/var/backups/gl0be/$RELEASE"

# Build here; deploy only this hosted frontend. No service/configuration changes.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use default
fi
cd "$PROJECT_DIR/frontend"
npm test
npm run build

ssh "$REMOTE_HOST" "mkdir -p '$STAGING_DIR'"
rsync -az dist/ "$REMOTE_HOST:$STAGING_DIR/"
ssh "$REMOTE_HOST" bash -s -- "$SITE_DIR" "$STAGING_DIR" "$BACKUP_DIR" <<'REMOTE'
set -euo pipefail
site_dir="$1"
staging_dir="$2"
backup_dir="$3"
test -f "$site_dir/index.html"
test -f "$staging_dir/index.html"
grep -q '<title>gl0be</title>' "$site_dir/index.html"
grep -q '<title>gl0be</title>' "$staging_dir/index.html"
mkdir -p "$backup_dir"
cp -a "$site_dir/." "$backup_dir/"

# Upload hashed assets first and switch the entry point atomically. Retain old
# assets so visitors who already loaded the previous HTML can finish loading it.
cp -a "$staging_dir/assets/." "$site_dir/assets/"
cp "$staging_dir/index.html" "$site_dir/.index.html.next"
mv "$site_dir/.index.html.next" "$site_dir/index.html"
rm -r "$staging_dir"
echo "Deployed app.gl0be.co; previous frontend saved to $backup_dir"
REMOTE

curl --fail --silent --show-error https://app.gl0be.co/ -o "$PROJECT_DIR/frontend/dist/live-index.html"
cmp "$PROJECT_DIR/frontend/dist/index.html" "$PROJECT_DIR/frontend/dist/live-index.html"
rm "$PROJECT_DIR/frontend/dist/live-index.html"
echo 'Verified live HTML matches the build.'
