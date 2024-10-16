#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ROOT_DIR=$SCRIPT_DIR/..
BUILD_DIR=$ROOT_DIR/_build

MODE=all
if [ ! -z "$1" ]; then
    MODE=$1
fi

BUILD_COMMAND="build"
if [ ! -z "$2" ]; then
    if [ "$2" == "build" ]; then
        BUILD_COMMAND="build"
    elif [ "$2" == "multi" ]; then
        BUILD_COMMAND="buildx build --platform linux/amd64,linux/arm64"
    else
        echo "Invalid build command, use 'build' or 'multi'"
        exit 1
    fi
fi

echo "Building $MODE with $BUILD_COMMAND"


docker ${BUILD_COMMAND} \
    -t ghcr.io/workforce-oss/workforce-builder:latest \
    --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
    --label "org.opencontainers.image.title=workforce-builder" \
    --label "org.opencontainers.image.description=Loaded with common packages for intermediate builds" \
    -f $BUILD_DIR/Dockerfile.builder $ROOT_DIR

build_ui_builder() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-builder-ui:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-builder-ui" \
        --label "org.opencontainers.image.description=Loaded with common packages for intermediate UI builds" \
        -f $BUILD_DIR/Dockerfile.builder.ui $ROOT_DIR
}

build_backend() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-base-server:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-base-server" \
        --label "org.opencontainers.image.description=Base Image for server, contains core os dependencies" \
        -f $BUILD_DIR/Dockerfile.base.server $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-server:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-server" \
        --label "org.opencontainers.image.description=Server Image for workforce" \
        -f $BUILD_DIR/Dockerfile.server $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-storage-api:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-storage-api" \
        --label "org.opencontainers.image.description=Storage API for workforce" \
        -f $BUILD_DIR/Dockerfile.storage-api $ROOT_DIR
}

build_frontend() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-ui:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-ui" \
        --label "org.opencontainers.image.description=UI Image for workforce" \
        -f $BUILD_DIR/Dockerfile.ui $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/excelsior:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=excelsior" \
        --label "org.opencontainers.image.description=Excelsior Image for workforce" \
        -f $BUILD_DIR/Dockerfile.excelsior $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-embedded-chat:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=workforce-embedded-chat" \
        --label "org.opencontainers.image.description=Embedded Chat Image for workforce" \
        -f $BUILD_DIR/Dockerfile.embedded-chat $ROOT_DIR
    

}

build_extension_server() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/vscode-extension-server:latest \
        --label "org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --label "org.opencontainers.image.title=vscode-extension-server" \
        --label "org.opencontainers.image.description=VSCode Extension Server Image for workforce" \
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

