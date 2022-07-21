/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import arg from 'arg';
import fs from 'fs';
import path from 'path';

const defaultCommand = 'init';
export type cliCommand = (argv?: string[]) => void;
export const commands: { [command: string]: () => Promise<cliCommand> } = {
  init: () => Promise.resolve(require('./commands/init').init),
};

function checkNextInstalled() {
  // Check that we are in a directory with next
  let packageJsonContent: string | null;
  try {
    const packageJsonPathname = path.resolve('./package.json');
    packageJsonContent = fs.readFileSync(packageJsonPathname, 'utf-8');
  } catch {
    console.warn('package.json not found in current directory.');
    return false;
  }

  let packageJson: any;
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch {
    console.warn('Unable to parse package.json in current directory.');
    return false;
  }

  let isNextInstalled;
  try {
    isNextInstalled = Object.getOwnPropertyNames(packageJson.dependencies).includes('next');
  } catch {
    isNextInstalled = false;
  }

  if(!isNextInstalled) {
    console.warn(`The module 'next' was not found.`);
  }
  return isNextInstalled;
}

export function exec() {

  const isNextInstalled = checkNextInstalled();
  const args = arg(
    {
      // Types
      '--version': Boolean,
      '--help': Boolean,

      // Aliases
      '-v': '--version',
      '-h': '--help',
    },
    {
      permissive: true,
    }
  );

  const foundCommand = Boolean(commands[args._[0]]);
  if (!foundCommand && args['--help']) {
    console.log(
      `
      Usage
        $ next-compute-js <command>
  
      Available commands
        ${Object.keys(commands).join(', ')}
  
      Options
        --version, -v   Version number
        --help, -h      Displays this message
  
      For more information run a command with the --help flag
        $ next-compute-js build --help
    `);
    process.exit(0);
  }

  const command = foundCommand ? args._[0] : defaultCommand
  const forwardedArgs = foundCommand ? args._.slice(1) : args._;

  // Make sure the `next <subcommand> --help` case is covered
  if (args['--help']) {
    forwardedArgs.push('--help');
  }

  if(!isNextInstalled) {
    console.error(
      `@fastly/next-compute-js requires that 'next' be in 'dependencies' of your 'package.json'. To add it, run 'npm install next'.`
    );
    process.exit(1);
  }

  commands[command]()
    .then((exec) => exec(forwardedArgs))
    .then(() => {
      if (command === 'build') {
        // ensure process exits after build completes so open handles/connections
        // don't cause process to hang
        process.exit(0)
      }
    });
}
