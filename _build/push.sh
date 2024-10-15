#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ROOT_DIR=$SCRIPT_DIR/..
BUILD_DIR=$ROOT_DIR/_build

# docker push \
#     jjoneson/workforce-builder:latest

# docker push \
#     jjoneson/workforce-builder-ui:latest 

# docker push \
#     jjoneson/workforce-base-server:latest

docker push \
    jjoneson/workforce-server:latest

docker push \
    jjoneson/workforce-ui:latest

docker push \
    jjoneson/workforce-storage-api:latest

docker push \
    jjoneson/excelsior:latest

docker push \
    jjoneson/workforce-embedded-chat:latest

docker push \
    jjoneson/vscode-extension-server:latest
