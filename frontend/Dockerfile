FROM node:20-alpine3.22 AS build

WORKDIR /app

RUN apk upgrade --no-cache

ARG VITE_TURNSTILE_SITE_KEY=""
ARG VITE_ALLOW_MOCK_PAYMENT="false"
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
ENV VITE_ALLOW_MOCK_PAYMENT=${VITE_ALLOW_MOCK_PAYMENT}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
