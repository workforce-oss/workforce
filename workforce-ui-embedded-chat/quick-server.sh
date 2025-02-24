#!/usr/bin/env bash

yarn run build

find ./build/static/js -name "main.*.js" -exec cp '{}' ./build/static/js/main.js \;

docker stop "embedded-chat"
docker rm "embedded-chat"

# start an nginx server that serves the build folder
docker run -d --name "embedded-chat" -p 8083:80 -v $(pwd)/build:/usr/share/nginx/html nginx:alpine