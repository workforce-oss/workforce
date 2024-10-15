#!/usr/bin/env bash
docker buildx build --platform linux/amd64 \
    -t vscode-server:latest \
    -f vscode-container/Dockerfile .
