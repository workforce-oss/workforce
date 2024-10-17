#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ROOT_DIR=$SCRIPT_DIR/..
BUILD_DIR=$ROOT_DIR/_build

MODE=$1
if [ -z "$MODE" ]; then
    echo "Usage: $0 <mode> <build|multi-push>"
    echo "  mode: backend, frontend, extension, all"
    echo "  build: build the image"
    echo "  push: build and push the image"
    exit 1
fi

if [ $MODE != "backend" ] && [ $MODE != "frontend" ] && [ $MODE != "extension" ] && [ $MODE != "all" ]; then
    echo "Invalid mode, use 'backend', 'frontend', 'extension' or 'all'"
    exit 1
fi

if [ "$2" == "build" ]; then
    BUILD_COMMAND="build"
elif [ "$2" == "push" ]; then
    BUILD_COMMAND="buildx build --platform linux/amd64,linux/arm64 --push"
else
    echo "Invalid build command, use 'build' or 'push'"
    exit 1
fi

echo "Building $MODE with $BUILD_COMMAND"


docker ${BUILD_COMMAND} \
    -t ghcr.io/workforce-oss/workforce-builder:latest \
    --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
    --annotation "index,manifest:org.opencontainers.image.title=workforce-builder" \
    --annotation "index,manifest:org.opencontainers.image.description=Loaded with common packages for intermediate builds" \
    -f $BUILD_DIR/Dockerfile.builder $ROOT_DIR

build_ui_builder() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-builder-ui:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-builder-ui" \
        --annotation "index,manifest:org.opencontainers.image.description=Loaded with common packages for intermediate UI builds" \
        -f $BUILD_DIR/Dockerfile.builder.ui $ROOT_DIR
}

build_backend() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-base-server:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-base-server" \
        --annotation "index,manifest:org.opencontainers.image.description=Base Image for server, contains core os dependencies" \
        -f $BUILD_DIR/Dockerfile.base.server $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-server:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-server" \
        --annotation "index,manifest:org.opencontainers.image.description=Server Image for workforce" \
        -f $BUILD_DIR/Dockerfile.server $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-storage-api:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-storage-api" \
        --annotation "index,manifest:org.opencontainers.image.description=Storage API for workforce" \
        -f $BUILD_DIR/Dockerfile.storage-api $ROOT_DIR
}

build_frontend() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-ui:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-ui" \
        --annotation "index,manifest:org.opencontainers.image.description=UI Image for workforce" \
        -f $BUILD_DIR/Dockerfile.ui $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/excelsior:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=excelsior" \
        --annotation "index,manifest:org.opencontainers.image.description=Excelsior Image for workforce" \
        -f $BUILD_DIR/Dockerfile.excelsior $ROOT_DIR

    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/workforce-embedded-chat:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=workforce-embedded-chat" \
        --annotation "index,manifest:org.opencontainers.image.description=Embedded Chat Image for workforce" \
        -f $BUILD_DIR/Dockerfile.embedded-chat $ROOT_DIR
    

}

build_extension_server() {
    docker ${BUILD_COMMAND} \
        -t ghcr.io/workforce-oss/vscode-extension-server:latest \
        --annotation "index,manifest:org.opencontainers.image.source=https://github.com/workforce-oss/workforce" \
        --annotation "index,manifest:org.opencontainers.image.title=vscode-extension-server" \
        --annotation "index,manifest:org.opencontainers.image.description=VSCode Extension Server Image for workforce" \
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

