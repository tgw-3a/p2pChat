#!/bin/sh
# relay bundle を待機して取り込んだ後、必要時のみビルドして起動する
set -e

for i in $(seq 1 60); do
  [ -f /relay-artifacts/static/js/bundle.js ] && break
  echo "Waiting for bundle.js..."
  sleep 1
done

if [ -f /relay-artifacts/static/js/bundle.js ]; then
  cp /relay-artifacts/static/js/bundle.js ./src/main/resources/static/js/bundle.js
fi

JAR=./build/libs/p2pchat-0.0.1-SNAPSHOT.jar
BUNDLE=./src/main/resources/static/js/bundle.js

# 初回 or bundle 更新時のみビルド（毎回 clean build しない）
if [ ! -f "$JAR" ] || [ "$BUNDLE" -nt "$JAR" ]; then
  ./gradlew build -x test
fi

exec java -jar "$JAR"
