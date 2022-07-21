/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import arg from 'arg';
import chalk from 'chalk';

import isError from 'next/dist/lib/is-error';
import { printAndExit } from 'next/dist/server/lib/utils';

import { generateServerProject } from '../../init-server/generate';

export function init(argv: string[] | undefined) {
  const validArgs: arg.Spec = {
    // Types
    '--help': Boolean,
    // Aliases
    '-h': '--help',
  }
  let args: arg.Result<arg.Spec>
  try {
    args = arg(validArgs, { argv })
  } catch (error) {
    if (isError(error) && error.code === 'ARG_UNKNOWN_OPTION') {
      return printAndExit(error.message, 1)
    }
    throw error
  }

  if (args['--help']) {
    console.log(
      `
      Description
        Initializes a compute-js project from a Next.js project
        
      Usage
        $ npx @fastly/next-compute-js init

      Learn more: ${chalk.cyan(
        'https://fastly.com/path/to/reference'
      )}`
    )
    return;
  }

  generateServerProject();
}
