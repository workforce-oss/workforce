#!/usr/bin/env bash

export INDEX_REPO_NAME=$(echo $INDEX_REPO_LOCATION | rev | cut -d'/' -f1 | rev)
export LOCAL_REPO_LOCATION=${HOME}/git/workspace

export LOCAL_REPO_LOCATION=${LOCAL_REPO_LOCATION}/${INDEX_REPO_NAME}

tar czf cache.tgz ${LOCAL_REPO_LOCATION}

openssl rsautl -encrypt -inkey ${ENCRYPTION_PUBLIC_KEY} -pubin -in cache.tgz -out cache.enc

# Upload Cache
mc cp ./cache.enc cache_storage/${WORKSPACE_ID}/cache.enc