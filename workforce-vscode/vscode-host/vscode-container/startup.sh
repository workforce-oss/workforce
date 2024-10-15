#!/usr/bin/env bash

# Inputs should be passed as environment variables
# INDEX_REPO_LOCATION is the location of the index repository
# INDEX_REPO_BRANCH is the branch of the index repository
# INDEX_REPO_USERNAME is the username for the index repository
# INDEX_REPO_PASSWORD is the password for the index repository

# Get the last part of the index repository location, the part after the last slash

export INDEX_REPO_NAME=$(echo $INDEX_REPO_LOCATION | rev | cut -d'/' -f1 | rev)
export LOCAL_REPO_LOCATION=${HOME}/git/workspace
mkdir -p $LOCAL_REPO_LOCATION
pushd $LOCAL_REPO_LOCATION

# Clone the index repository
git clone -b $INDEX_REPO_BRANCH https://$INDEX_REPO_USERNAME:$INDEX_REPO_PASSWORD@$INDEX_REPO_LOCATION
git config --global user.email "robot@robot.dev"
git config --global user.name "Robot"
popd

# get index.json from the repository
export INDEX_JSON_LOCATION=${LOCAL_REPO_LOCATION}/${INDEX_REPO_NAME}/index.json

# get the "caches" section from the index.json
export CACHES=$(jq '.caches' $INDEX_JSON_LOCATION)

# format $INDEX_REPO_LOCATION with _ instead of / for the cache name
export CACHE_NAME=$(echo $INDEX_REPO_LOCATION | tr / _)

export LOCAL_REPO_LOCATION=${LOCAL_REPO_LOCATION}/${INDEX_REPO_NAME}

# Start the webserver and send it to the background
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 && node /app/server/index.js &

echo ${@}
# Start the application
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 && $OPENVSCODE_SERVER_ROOT/bin/openvscode-server --host 0.0.0.0 --without-connection-token --disable-workspace-trust "${@}" &


# Wait for the application to start
sleep 5

cd /app/browser
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 \
    && node index.js "${@}"
