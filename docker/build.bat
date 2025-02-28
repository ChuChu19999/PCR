@echo off
chcp 1251

:: Включаем BuildKit для ускорения сборки
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

:: Параллельная сборка образов с оптимизированными настройками
docker compose build ^
  --parallel ^
  --build-arg BUILDKIT_INLINE_CACHE=1 ^
  --progress=plain > build_log.txt 2>&1 ^
  --no-cache
docker compose push

%*