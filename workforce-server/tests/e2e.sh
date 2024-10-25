#!/usr/bin/env bash

set -e

cleanup() {
    set +e
    docker stop test-instance
    docker rm test-instance
    docker stop redis-instance
    docker rm redis-instance
    docker stop weaviate
    docker rm weaviate
}

trap cleanup EXIT SIGINT SIGTERM ERR

# Create a network
if [ ! "$(docker network ls --filter name=mach -q)" ]; then
  docker network create mach
fi

docker run -itd --rm --name test-instance --network mach -e POSTGRES_PASSWORD=password -p 5492:5432 postgres
# wait for postgres to start, 5 second timeout, using pg_isready
TIMEOUT=5
while ! docker exec -it test-instance pg_isready -U postgres; do
  TIMEOUT=$(($TIMEOUT-1))
  if [ $TIMEOUT -eq 0 ]; then
    echo "Timeout waiting for postgres to start"
    exit 1
  fi
  sleep 1
done

docker exec -it test-instance psql -U postgres -c "CREATE DATABASE app;"
docker exec -it test-instance psql -U postgres -c "CREATE USER testuser WITH PASSWORD 'password';"
# set owner
docker exec -it test-instance psql -U postgres -c "ALTER DATABASE app OWNER TO testuser;"

# start redis on 6379
docker run -itd --rm --name redis-instance --network mach -p 6379:6379 \
    -e "REDIS_ARGS=--requirepass password --user workforce-api on >password ~* allcommands allkeys allchannels --user default off nopass nocommands" \
    redis/redis-stack
TIMEOUT=5
while ! docker exec -it redis-instance redis-cli ping; do
  TIMEOUT=$(($TIMEOUT-1))
  if [ $TIMEOUT -eq 0 ]; then
    echo "Timeout waiting for redis to start"
    exit 1
  fi
  sleep 1
done

# start weaviate on 8088, and 50058
docker run -itd --rm --name weaviate --network mach -p 5002:8080 -p 5001:50051 \
    -e "AUTHENTICATION_APIKEY_ENABLED=true" \
    -e "AUTHENTICATION_APIKEY_USERS=test" \
    -e "AUTHENTICATION_APIKEY_ALLOWED_KEYS=test" \
    cr.weaviate.io/semitechnologies/weaviate:1.26.1

TIMEOUT=5
while ! curl -s http://localhost:5002/v1/meta; do
  TIMEOUT=$(($TIMEOUT-1))
  if [ $TIMEOUT -eq 0 ]; then
    echo "Timeout waiting for weaviate to start"
    exit 1
  fi
  sleep 1
done

export NODE_ENV=e2e
mocha --exit tests/e2e/**/*.spec.ts --timeout 10000 2>&1