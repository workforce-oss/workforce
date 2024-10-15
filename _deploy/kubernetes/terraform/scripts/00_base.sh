#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

COMMAND=$1
ENV_NAME=$2
if [ -z "$COMMAND" ] || [ -z "$ENV_NAME" ]; then
    echo "Usage: $0 <plan or apply> <env_name>"
    exit 1
fi

if [ "$COMMAND" != "plan" ] && [ "$COMMAND" != "apply" ]; then
    echo "Usage: $0 <plan or apply> <env_name>"
    exit 1
fi

$SCRIPT_DIR/${COMMAND}.sh 00_base $ENV_NAME

# kubectl patch clusterpolicy/cluster-policy \
#     -n gpu-operator --type merge \
#     -p '{"spec": {"devicePlugin": {"config": {"name": "time-slicing-config-all", "default": "any"}}}}'