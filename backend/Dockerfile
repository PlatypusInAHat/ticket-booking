FROM node:20-alpine3.22

WORKDIR /app

RUN apk upgrade --no-cache

ARG SERVICE_START_SCRIPT=start
ENV SERVICE_START_SCRIPT=${SERVICE_START_SCRIPT}

COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY . .

EXPOSE 5000 5101 5102 5103 5104 5105

CMD ["sh", "scripts/docker-entrypoint.sh"]
