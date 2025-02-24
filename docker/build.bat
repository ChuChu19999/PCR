@echo off

:: Включаем BuildKit для ускорения сборки
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

:: Параллельная сборка образов с оптимизированными настройками
docker compose build ^
  --parallel ^
  --build-arg BUILDKIT_INLINE_CACHE=1 ^
  --progress=plain ^
  --no-cache
docker compose push

%*