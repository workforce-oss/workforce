#!/usr/bin/env bash

yarn install --offline --frozen-lockfile

if [ ! -d "workforce-core/dist" ]; then
    yarn workspace workforce-core run build
fi
if [ ! -d "workforce-api-client/dist" ]; then
    yarn workspace workforce-api-client run build
fi
yarn workspace workforce-cli run build
if [ -z "$WORKFORCE_OAUTH2_ISSUER_URI" ]; then
    export WORKFORCE_OAUTH2_ISSUER_URI=http://localhost:8085/workforce-api/insecure
fi
if [ -z "$WORKFORCE_OAUTH2_CLIENT_ID" ]; then
    export WORKFORCE_OAUTH2_CLIENT_ID="https://api/"
fi
if [ -z "$WORKFORCE_API_URL" ]; then
    export WORKFORCE_API_URL=http://localhost:8085/workforce-api
fi

node workforce-cli/dist/index.js $@
