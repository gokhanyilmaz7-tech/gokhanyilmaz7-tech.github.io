#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p bin
swiftc -swift-version 5 -O Sources/*.swift -o bin/actuarial-engine
