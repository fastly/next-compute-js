/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import commandLineArgs from 'command-line-args';

import {
  NEXT_COMPUTE_JS_DIRECTORY_NAME,
  VERCEL_DIRECTORY_NAME,
  VERCEL_PROJECT_JSON,
  VERCEL_PROJECT_JSON_FILENAME
} from "../constants.js";
import {
  loadPackageJson,
} from '../util/package.js';
import {
  findNextComputeJsServerLibStatus,
  getInstalledNextVersion,
  validateSupportedNextVersion,
} from '../util/next.js';

const OPTION_DEFINITIONS: commandLineArgs.OptionDefinition[] = [
  { name: 'help', type: Boolean, },
];

export default function build(argv: string[]) {

  // Parse command line options
  let commandLineOptions: ReturnType<typeof commandLineArgs>;
  try {
    commandLineOptions = commandLineArgs(OPTION_DEFINITIONS, { argv });
  } catch(ex) {
    console.error('Error parsing command line arguments.')
    console.error(ex);
    displayHelp();
    return;
  }

  if (commandLineOptions['help']) {
    displayHelp();
    return;
  }

  console.log(`Starting 'build'...`);

  const computeJsDir = path.resolve(NEXT_COMPUTE_JS_DIRECTORY_NAME);
  if (!fs.existsSync(computeJsDir)) {
    throw new Error(`❌ @fastly/next-compute-js Compute project directory '${computeJsDir}' must exist. Try running 'init' command first.`);
  }

  // load package.json
  let packageJson: any;
  try {
    packageJson = loadPackageJson();
  } catch(ex) {
    throw new Error(`❌ Can't load package.json in current directory.`, { cause: ex });
  }

  const computeJsPackageJson = loadPackageJson(computeJsDir);

  let isValidNext = false;

  // Check the case when we have a next runtime override.
  // Checking for the lib status for a null version should give us 1 entry in devDependencies...
  // If it does, and that value is a "file" url, then we consider this valid.
  const nullLibStatus = findNextComputeJsServerLibStatus(computeJsPackageJson, null);
  if (
    nullLibStatus.devDependenciesToRemove.length === 1
  ) {
    const theDependency = nullLibStatus.devDependenciesToRemove[0];
    const theDependencyValue = computeJsPackageJson.devDependencies[theDependency];
    if (theDependencyValue.startsWith('file:')) {
      console.log(`Detected Next runtime override: ${theDependency}`);
      isValidNext = true;
    }
  }

  if (!isValidNext) {
    // Make sure that the installed version of next is one of the supported ones.
    const nextVersion = getInstalledNextVersion(packageJson);
    validateSupportedNextVersion(nextVersion);

    console.log(`Detected Next.js version ${nextVersion}.`);

    // Check to make sure that the @fastly/next-compute-js-server is set up correctly
    // for the current version of next.
    // If it is set up, then findNextComputeJsServerLibStatus should return empty arrays.
    const status = findNextComputeJsServerLibStatus(computeJsPackageJson, nextVersion);
    if (
      status.dependenciesToRemove.length > 0 ||
      status.devDependenciesToRemove.length > 0 ||
      status.devDependenciesToAdd.length > 0
    ) {
      throw new Error(`❌ Unable to detect valid Next runtime. @fastly/next-compute-js-server doesn't appear to be set up correctly. Try running 'setup-next-runtime' command first.`);
    }
  }

  // Create .vercel if it doesn't already exist
  fs.mkdirSync(VERCEL_DIRECTORY_NAME, { recursive: true });

  // Create .vercel/project.json if it doesn't already exist
  if (!fs.existsSync(VERCEL_PROJECT_JSON_FILENAME)) {
    console.log(`Vercel project file '${VERCEL_PROJECT_JSON_FILENAME}' not found, creating...`);
    fs.writeFileSync(
      VERCEL_PROJECT_JSON_FILENAME,
      JSON.stringify(VERCEL_PROJECT_JSON),
      'utf-8'
    );
  }

  console.log(`Building next project...`);
  console.log(`npx -y vercel build`);
  child_process.spawnSync('npx', [ '-y', 'vercel', 'build' ], { stdio: 'inherit' });

  console.log(`Transforming vercel build output...`);
  child_process.spawnSync('npx', [ '@fastly/serve-vercel-build-output', 'transform' ], { stdio: 'inherit', cwd: computeJsDir });

  console.log(`'build' complete.`);
}

function displayHelp() {
  console.log(`\
next-compute-js: Run your Next.js application on Fastly Compute.

Builds and transforms the Next.js application for running under next-compute-js.

Usage:
  npx @fasty/next-compute-js build
`);
}
