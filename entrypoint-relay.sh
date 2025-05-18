#!/bin/sh
set -e

mkdir -p ./data
mkdir -p /relay-artifacts/static/js

# Relay を起動せずにまず PeerID をチェック
node relay.js &
RELAY_PID=$!

# peerId.pb ができるまで待機
for i in $(seq 1 30); do
  [ -f ./data/peerId.pb ] && break
  echo "[WAIT] peerId.pb not found, retrying... ($i)"
  sleep 1
done

if [ ! -f ./data/peerId.pb ]; then
  echo "[ERROR] peerId.pb was not generated."
  kill $RELAY_PID
  exit 1
fi

# アドレス生成
node generate-multiaddr.js > /relay-artifacts/relay.env

# bundle生成
set -a
. /relay-artifacts/relay.env
set +a
if [ -z "$RELAY_MULTIADDR" ]; then
  echo "[ERROR] RELAY_MULTIADDR is not defined"
  exit 1
fi

echo "[INFO] Using RELAY_MULTIADDR=$RELAY_MULTIADDR"
RELAY_MULTIADDR=$RELAY_MULTIADDR node esbuild.js

# 正しく生成された bundle.js を relay-artifacts にコピー
cp src/main/resources/static/js/bundle.js /relay-artifacts/static/js/bundle.js

# 🎯 Relay をフォアグラウンドで起動して、コンテナを維持
wait $RELAY_PID