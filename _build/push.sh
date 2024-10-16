#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ROOT_DIR=$SCRIPT_DIR/..
BUILD_DIR=$ROOT_DIR/_build

docker push \
    ghcr.io/workforce-oss/workforce-builder:latest

docker push \
    ghcr.io/workforce-oss/workforce-builder-ui:latest 

docker push \
    ghcr.io/workforce-oss/workforce-base-server:latest

docker push \
    ghcr.io/workforce-oss/workforce-server:latest

docker push \
    ghcr.io/workforce-oss/workforce-ui:latest

docker push \
    ghcr.io/workforce-oss/workforce-storage-api:latest

docker push \
    ghcr.io/workforce-oss/excelsior:latest

docker push \
    ghcr.io/workforce-oss/workforce-embedded-chat:latest

docker push \
    ghcr.io/workforce-oss/vscode-extension-server:latest
