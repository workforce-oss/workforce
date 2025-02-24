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

mv flow-json-schema.json ../docs/mkdocs/docs/flows/flow-json-schema.json

mv channel-json-schema.json ../docs/mkdocs/docs/flows/channels/channel-json-schema.json
mv documentation-json-schema.json ../docs/mkdocs/docs/flows/documentation/documentation-json-schema.json
mv resource-json-schema.json ../docs/mkdocs/docs/flows/resources/resource-json-schema.json
mv task-json-schema.json ../docs/mkdocs/docs/flows/tasks/task-json-schema.json
mv tool-json-schema.json ../docs/mkdocs/docs/flows/tools/tool-json-schema.json
mv tracker-json-schema.json ../docs/mkdocs/docs/flows/trackers/tracker-json-schema.json

mv credential-json-schema.json ../docs/mkdocs/docs/credentials/credential-json-schema.json
mv worker-json-schema.json ../docs/mkdocs/docs/workers/worker-json-schema.json
mv document-repository-json-schema.json ../docs/mkdocs/docs/document-repositories/document-repository-json-schema.json
mv skill-json-schema.json ../docs/mkdocs/docs/skills/skill-json-schema.json

mv user-json-schema.json ../docs/mkdocs/docs/identity/user-json-schema.json
mv org-json-schema.json ../docs/mkdocs/docs/identity/org-json-schema.json
mv org-user-json-schema.json ../docs/mkdocs/docs/identity/org-user-json-schema.json

mv identity-api-schema.json ../docs/mkdocs/docs/api/identity-api-schema.json
mv org-resource-api-schema.json ../docs/mkdocs/docs/api/workforce-api-schema.json
mv flow-resource-api-schema.json ../docs/mkdocs/docs/api/flow-subresource-api-schema.json
popd