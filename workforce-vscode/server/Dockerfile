FROM node:18-alpine as builder
RUN apk add g++ make py3-pip

WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY lib/package.json lib/package.json
COPY server/package.json server/package.json

RUN yarn install

COPY lib/ lib/
RUN yarn workspace lib install && yarn workspace lib run build

COPY server/ server/
RUN yarn workspace server install && yarn workspace server run package

EXPOSE 3000

CMD ["node", "server/dist/index.js"]