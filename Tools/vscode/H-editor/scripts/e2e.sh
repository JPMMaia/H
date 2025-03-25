#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/out/packages/client/src/test"
export CODE_TESTS_WORKSPACE="$(pwd)/packages/client/test_fixture"

node "$(pwd)/out/packages/client/src/test/runTest"
