#!/bin/sh
# relay.env 出力待ち → 読み込む → bundle.js を Spring Boot に組み込む
for i in $(seq 1 30); do
  [ -f /relay-artifacts/static/js/bundle.js ] && break
  echo "Waiting for bundle.js..."
  sleep 1
done

cp /relay-artifacts/static/js/bundle.js ./src/main/resources/static/js/bundle.js

./gradlew clean build -x test

exec java -jar ./build/libs/p2pchat-0.0.1-SNAPSHOT.jar