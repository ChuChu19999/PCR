#!/bin/sh

# Включаем BuildKit для ускорения сборки
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Параллельная сборка образов с оптимизированными настройками
docker compose build \
  --parallel \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  --no-cache
docker compose push

exec "$@"