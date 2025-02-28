# Этап сборки фронтенда
FROM harbor.gd-urengoy.gazprom.ru/docker_hub/node:22-alpine AS builder
WORKDIR /app

# Копируем только файлы зависимостей для лучшего кэширования
COPY ../frontend/package*.json ./

# Настройка npm и установка зависимостей
# RUN npm config set registry=https://repo.gd-urengoy.gazprom.ru/repository/npm-proxy/ && \
#     npm config set strict-ssl false && \
RUN npm ci && \
    npm cache clean --force

# Установка antd
# RUN npm config set registry=https://repo.gd-urengoy.gazprom.ru/repository/npm-gdu/ && \
#     npm config set strict-ssl false
RUN npm install antd@5.21.2 --verbose

# Копирование и сборка приложения
COPY ../frontend/ .
RUN npm run build

# Этап настройки Nginx
FROM harbor.gd-urengoy.gazprom.ru/docker_hub/nginx:1.25.2-alpine AS final

# Настройка часового пояса
RUN rm -rf /etc/localtime && \
    ln -s /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime && \
    echo "Asia/Yekaterinburg" > /etc/timezone

# Копируем конфигурации
COPY docker/nginx/dev/django.conf /etc/nginx/sites-enabled/default
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/custom_50x.html /usr/share/nginx/html/custom_50x.html

# static files
COPY --from=builder /app/dist ./frontend_static

# Установка корневого сертификата
COPY ./backend/root.crt /usr/local/share/ca-certificates/root.crt
COPY ./backend/root.crt /usr/share/ca-certificates/root.crt
RUN update-ca-certificates

EXPOSE 80 443