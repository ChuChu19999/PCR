###########
# BUILDER #
###########

# Базовый образ Python
FROM harbor.gd-urengoy.gazprom.ru/docker_hub/python:3.11-slim as builder

# Установка рабочей директории
WORKDIR /usr/src/app

# Настройка переменных окружения Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Установка сертификатов и настройка репозитория в одном слое
COPY ./docker/django/root.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates && \
    rm -rf /etc/apt/sources.list /etc/apt/sources.list.d/* && \
    echo "deb [trusted=yes] https://repo.gd-urengoy.gazprom.ru/repository/debian-bookworm/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list

# Установка зависимостей backend
COPY ../../../backend/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt

#########
# FINAL #
#########

# pull official base image
FROM harbor.gd-urengoy.gazprom.ru/docker_hub/python:3.11-slim

# Копирование сертификатов и настройка в одном слое
COPY ./docker/django/root.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates && \
    rm -rf /etc/apt/sources.list /etc/apt/sources.list.d/* && \
    echo "deb [trusted=yes] https://repo.gd-urengoy.gazprom.ru/repository/debian-bookworm/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    addgroup --system app && \
    useradd -g app app && \
    mkdir -p /home/app/web/backend_static /home/app/web/media

# Создание директории приложения
RUN mkdir -p /home/app

# Создание app user
RUN addgroup --system app && useradd -g app app

# Создание необходимых директорий и настройка окружения
ENV HOME=/home/app
ENV APP_HOME=/home/app/web
RUN mkdir $APP_HOME
RUN mkdir $APP_HOME/backend_static
RUN mkdir $APP_HOME/media
WORKDIR $APP_HOME

# Копирование и установка зависимостей
COPY --from=builder /usr/src/app/wheels /wheels
RUN pip install --no-cache /wheels/* -i https://repo.gd-urengoy.gazprom.ru/repository/pypi-org-proxy/simple --trusted-host repo.gd-urengoy.gazprom.ru && \
    pip install gunicorn==21.2.0 -i https://repo.gd-urengoy.gazprom.ru/repository/pypi-org-proxy/simple --trusted-host repo.gd-urengoy.gazprom.ru

# Копирование entrypoint.prod.sh
COPY ./docker/django/prod/entrypoint.prod.sh .
RUN sed -i 's/\r$//g' $APP_HOME/entrypoint.prod.sh && \
    chmod +x $APP_HOME/entrypoint.prod.sh

# Копирование проекта Django
COPY ../../../backend $APP_HOME

# Установка прав на файлы
RUN chown -R app:app $APP_HOME

# Переключение на пользователя приложения
USER app

# Запуск приложения через entrypoint
ENTRYPOINT ["/home/app/web/entrypoint.prod.sh"]