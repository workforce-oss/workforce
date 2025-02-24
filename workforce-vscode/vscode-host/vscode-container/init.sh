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
git clone --depth 1 -b $INDEX_REPO_BRANCH https://$INDEX_REPO_USERNAME:$INDEX_REPO_PASSWORD@$INDEX_REPO_LOCATION
git config --global user.email "robot@robot.dev"
git config --global user.name "Robot"
popd

# get index.json from the repository
export INDEX_JSON_LOCATION=${LOCAL_REPO_LOCATION}/${INDEX_REPO_NAME}/index.json

# get the "caches" section from the index.json
export CACHES=$(jq '.caches[]' $INDEX_JSON_LOCATION)

export PATH=$PATH:$HOME/minio-binaries/

# prepare all caches
for CACHE in ${CACHES}; do
mkdir -p $CACHE
done

mc alias set cache_storage ${CACHE_HOSTNAME} ${CACHE_ACCESS_KEY} ${CACHE_SECRET_KEY}
mc admin info cache_storage

export LOCAL_REPO_LOCATION=${LOCAL_REPO_LOCATION}/${INDEX_REPO_NAME}

# Download and extract caches
pushd ${LOCAL_REPO_LOCATION}
mc cp cache_storage/${WORKSPACE_ID}/cache.enc ./cache.enc

# decrypt
openssl rsautl -decrypt -inkey ${ENCRYPTION_PRIVATE_KEY}.pem -in cache.enc > cache.tgz
rm cache.enc

tar -xzf ./cache.tgz && rm .cache.tgz
popd



