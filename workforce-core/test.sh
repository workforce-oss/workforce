#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

pushd $SCRIPT_DIR
if [ -z "$1" ]; then
echo "Running all tests"
  npm run test
fi

# if first param is 'coverage', run all tests with coverage
if [[ $1 == "coverage" ]]; then
  echo "Running all tests with coverage"
  npm run test:coverage
fi

# if first param does not contain .ts, assume it a directory under tests/<dir>
if [[ $1 != *".ts"* ]]; then
  echo "Running tests in directory $1"
  npm run test:file tests/$1/**/*.ts
fi

#if it includes .ts, assume it is a file under tests/
if [[ $1 == *".ts"* ]]; then
  echo "Running test file $1"
  npm run test:file tests/$1
fi

mv identity-api-schema.json ../docs/mkdocs/docs/api/identity-api-schema.json
mv org-resource-api-schema.json ../docs/mkdocs/docs/api/workforce-api-schema.json
mv flow-resource-api-schema.json ../docs/mkdocs/docs/api/flow-subresource-api-schema.json
mv flow-json-schema.json ../docs/mkdocs/docs/api/flow-json-schema.json
popd