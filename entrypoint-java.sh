#!/bin/sh
# relay bundle を待機しつつ、Java アプリ本体は即起動できるようにする
set -e

BUNDLE=/relay-artifacts/static/js/bundle.js

for i in $(seq 1 20); do
  [ -f "$BUNDLE" ] && break
  echo "Waiting for bundle.js..."
  sleep 1
done

if [ ! -f "$BUNDLE" ]; then
  echo "[WARN] bundle.js not found yet; starting web app anyway"
fi

exec java -jar /app/app.jar
