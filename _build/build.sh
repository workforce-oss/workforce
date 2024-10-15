#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ROOT_DIR=$SCRIPT_DIR/..
BUILD_DIR=$ROOT_DIR/_build

MODE=all
if [ ! -z "$1" ]; then
    MODE=$1
fi


docker build \
    -t jjoneson/workforce-builder:latest \
    -f $BUILD_DIR/Dockerfile.builder $ROOT_DIR

build_ui_builder() {
    docker build \
        -t jjoneson/workforce-builder-ui:latest \
        -f $BUILD_DIR/Dockerfile.builder.ui $ROOT_DIR
}

build_backend() {
    docker build \
        -t jjoneson/workforce-base-server:latest \
        -f $BUILD_DIR/Dockerfile.base.server $ROOT_DIR

    docker build \
        -t jjoneson/workforce-server:latest \
        -f $BUILD_DIR/Dockerfile.server $ROOT_DIR

    docker build \
        -t jjoneson/workforce-storage-api:latest \
        -f $BUILD_DIR/Dockerfile.storage-api $ROOT_DIR
}

build_frontend() {
    docker build \
        -t jjoneson/workforce-ui:latest \
        -f $BUILD_DIR/Dockerfile.ui $ROOT_DIR

    docker build \
        -t jjoneson/excelsior:latest \
        -f $BUILD_DIR/Dockerfile.excelsior $ROOT_DIR

    docker build \
        -t jjoneson/workforce-embedded-chat:latest \
        -f $BUILD_DIR/Dockerfile.embedded-chat $ROOT_DIR
    

}

build_extension_server() {
    docker build \
        -t jjoneson/vscode-extension-server:latest \
        -f $BUILD_DIR/Dockerfile.vscode-extension-server $ROOT_DIR/workforce-vscode
}

if [ "$MODE" == "all" ] || [ "$MODE" == "backend" ]; then
    build_backend
fi

if [ "$MODE" == "all" ] || [ "$MODE" == "frontend" ]; then
    build_ui_builder
    build_frontend
fi

if [ "$MODE" == "all" ] || [ "$MODE" == "extension" ]; then
    build_extension_server
fi

