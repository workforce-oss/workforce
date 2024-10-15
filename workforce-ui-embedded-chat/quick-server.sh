#!/usr/bin/env bash

# start an nginx server that serves the build folder
docker run -d -p 8083:80 -v $(pwd)/build:/usr/share/nginx/html nginx:alpine