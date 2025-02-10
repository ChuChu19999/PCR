#!/bin/sh

docker compose build --no-cache
docker compose push

exec "$@"