#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ENV_NAME=$1
if [ -z "$ENV_NAME" ]; then
    echo "Usage: $0 <env_name>"
    exit 1
fi

$SCRIPT_DIR/apply.sh 01_app_infra $ENV_NAME