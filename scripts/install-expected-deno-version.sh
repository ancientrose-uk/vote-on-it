#!/usr/bin/env bash

rootDir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

deno upgrade --version "$(cat "$rootDir/.deno-version")"
