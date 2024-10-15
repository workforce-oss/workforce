#!/usr/bin/env bash
docker build \
    -t vscode-extension-server:latest \
    -f server/Dockerfile .

