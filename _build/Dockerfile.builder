FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json yarn.lock ./

COPY workforce-core/package.json ./workforce-core/
COPY workforce-api-client/package.json ./workforce-api-client/
COPY workforce-ui-core/package.json ./workforce-ui-core/

COPY workforce-server/package.json ./workforce-server/
COPY workforce-storage-api/package.json ./workforce-storage-api/

RUN yarn install --frozen-lockfile