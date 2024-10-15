#!/usr/bin/env bash
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$1
ENV_NAME=$2
if [ -z "$ENV_NAME" ]; then
    echo "Usage: $0 <root_dir> <env_name>"
    exit 1
fi
if [ -z "$ROOT_DIR" ]; then
    echo "Usage: $0 <root_dir> <env_name>"
    exit 1
fi
ROOT_MODULE=$ENV_NAME
# if root module starts with gke, set it to gke
if [[ $ROOT_MODULE == gke* ]]; then
    ROOT_MODULE=gke
fi

pushd $SCRIPT_DIR/../infra/$ROOT_DIR/$ROOT_MODULE

# Check if the var file exists
if [ ! -f "terraform.${ENV_NAME}.tfvars" ]; then
    echo "No terraform.${ENV_NAME}.tfvars file found"
    popd
    exit 1
fi

RUN_CMD="docker run -it --rm -v $PWD/../..:/infra -v $HOME/.kube:/root/.kube -v $HOME/.config/gcloud:/root/.config/gcloud -w /infra/$ROOT_DIR/$ROOT_MODULE tf"

$RUN_CMD init
WORKSPACE_CMD="workspace select -or-create $ENV_NAME"
$RUN_CMD $WORKSPACE_CMD

$RUN_CMD apply --var-file terraform.${ENV_NAME}.tfvars --auto-approve

popd