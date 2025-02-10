FROM harbor.gd-urengoy.gazprom.ru/docker_hub/node:22-alpine AS builder
WORKDIR /app

# ???
COPY ../frontend/package.json package.json
COPY ../frontend/package-lock.json package-lock.json

#global
RUN npm config set registry=https://repo.gd-urengoy.gazprom.ru/repository/npm-proxy/
RUN npm config set strict-ssl false


RUN npm ci && npm cache clean --force

# ???
COPY ../frontend/ .
RUN npm run build

FROM harbor.gd-urengoy.gazprom.ru/docker_hub/nginx:1.25.2-alpine

RUN rm -rf /etc/localtime
RUN ln -s /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime
RUN echo "Asia/Yekaterinburg" > /etc/timezone

# nginx conf
ADD docker/nginx/dev/django.conf /etc/nginx/sites-enabled/default
ADD docker/nginx/nginx.conf /etc/nginx/nginx.conf

COPY docker/nginx/custom_50x.html /usr/share/nginx/html/custom_50x.html

# static files
COPY --from=builder /app/build ./frontend_static

# root.crt
COPY ./backend/root.crt /usr/local/share/ca-certificates/root.crt
COPY ./backend/root.crt /usr/share/ca-certificates/root.crt
RUN update-ca-certificates

EXPOSE 80 443