#!/usr/bin/env bash

if [ -z "$1" ]; then
echo "Running all tests"
  npm run test
  exit 0
fi

# if first param is 'coverage', run all tests with coverage
if [ $1 == "coverage" ]; then
  echo "Running all tests with coverage"
  npm run test:coverage
  exit 0
fi

# if first param does not contain .ts, assume it a directory under tests/<dir>
if [[ $1 != *".ts"* ]]; then
  echo "Running tests in directory $1"
  npm run test:file tests/$1/**/*.ts
  exit 0
fi

#if it includes .ts, assume it is a file under tests/
if [[ $1 == *".ts"* ]]; then
  echo "Running test file $1"
  npm run test:file tests/$1
  exit 0
fi