# Vote On It

Vote On It is an open source voting project run by Natalie Carey from Ancient
Rose &amp; Now Prototype It

## Contributing

Feel free to contribute, if you're going to contribute we recommend that you:

1. Discuss whether your idea is a good fit for the project by opening an issue
   (if not, you're welcome to fork the project and make the changes exactly as
   you want them)
2. Clone the codebase and run `deno install && deno task test:browser:setup`
3. When you're ready to make code changes run `deno run dev` which will start
   the dev server and watch for file changes, the tests and build will run on
   every file change. This script has a few options which are set through
   environment variables:
   - `VOI__PORT` (or just `PORT`) - The port to run the dev server on
     (default: 3000)
   - `VOI__DEV__AUTO_FIX_FORMATTING` - Set this to `true` to automatically fix
     formatting issues (default: false)
4. You can set up Natalie's pre-commit hook if you want it, the instructions are
   in `scripts/natalies-pre-commit-hook.sh` alongside the script itself.
5. Raise a Pull Request when you're starting to make progress to get some early
   feedback - You can always update the PR (note: PRs are public, so make sure
   anything you put in a PR is ready to be seen by the world - it doesn't have
   to be perfect but you might not want your personal details in the code)

## About our licence choice

At Ancient Rose & Now Prototype It we love open source software - our goal is to
make this codebase as open and free as possible but please check the licence
details for the precise terms.

## About the project

This project started life as a tool for a local community group to manage its
voting during meetings and the project touched on technologies that interested
Natalie.

Natalie's's been advocating for a particular approach to starting projects and
this project seemed like a good place to demonstrate those concepts.
[The first Pull Request is designed to show how she approaches the early stages of projects](https://github.com/ancientrose-uk/vote-on-it/pull/1)
and is intended as a discussion/learning tool.

## Other projects from Ancient Rose & Now Prototype It

The big one is
[Now Prototype It](https://github.com/nowprototypeit/nowprototypeit), a tool for
prototyping websites. There might be more.

Beyond that we're teaching TDD and Agile, building websites for clients and
always promising we're about to release some YouTube videos. Check the websites
for more [Ancient Rose](https://ancientrose.co.uk) and
[Now Prototype It](https://nowprototype.it) for more details.

## Contributors

(waiting to hear whether contributors want to be named or not, if you're
contributing feel free to put your name and GitHub profile link here with a
little description)
