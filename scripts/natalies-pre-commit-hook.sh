#!/bin/sh

# If you want to use this run:
#
# ln -s `pwd`/scripts/natalies-pre-commit-hook.sh .git/hooks/pre-commit
#
# you don't have to use this, the PR checks will run these checks for you!
#
# Note - this is intentionally set up to allow changes over time, you might choose not to opt-in to this.

deno task check:all:fix &&
deno task check:all &&
deno task test:unit &&
deno task test:browser:all &&
deno task test:browser:all:no-js &&
deno task test:semitest:all
