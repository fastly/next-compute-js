#!/usr/bin/env node

/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import commandLineArgs from 'command-line-args';

const KNOWN_COMMANDS = {
  'init': './commands/init.js',
  'setup-next-runtime': './commands/setup-next-runtime.js',
  'build': './commands/build.js',
};

main().then(() => {});

async function main() {

  const mainDefinitions = [
    { name: 'command', defaultOption: true }
  ]
  const mainOptions = commandLineArgs(mainDefinitions, { stopAtFirstUnknown: true });
  const argv = mainOptions._unknown || [];

  const command: string | undefined = mainOptions.command;

  let script = undefined;
  if (command != null && Object.keys(KNOWN_COMMANDS).includes(command)) {
    const module = await import(KNOWN_COMMANDS[command as keyof typeof KNOWN_COMMANDS]);
    script = module.default;
  }

  if (script == null) {
    displayHelp();
    return;
  }

  script(argv);

}


function displayHelp() {
  console.log(`\
next-compute-js: Run your Next.js application on Fastly Compute.

Run this command from your Next.js application's directory, in other words the one that
contains your package.json file that references "next".

Usage:
  npx @fasty/next-compute-js <command> [<flags>]

<command> can be one of the following:

  init                  - Initializes a Compute application.
  setup-next-runtime    - Sets up or updates the Compute Next.js Server Runtime library.
  build                 - Builds and transforms the Next.js application for running under next-compute-js.

To get help for any of the commands, run the command with the --help flag.
`);
}
