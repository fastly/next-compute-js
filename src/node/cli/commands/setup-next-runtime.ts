/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';

import commandLineArgs from "command-line-args";

import {
  NEXT_COMPUTE_JS_DIRECTORY_NAME,
} from "../constants.js";
import {
  findNextComputeJsServerLibStatus, getInstalledNextVersion, validateSupportedNextVersion,
} from '../util/next.js';
import {
  loadPackageJson, writePackageJson,
} from '../util/package.js';

const OPTION_DEFINITIONS: commandLineArgs.OptionDefinition[] = [
  { name: 'help', type: Boolean, },
  { name: 'next-version', type: String, },
  { name: 'next-runtime', type: String, },
  { name: 'update-package-json', type: Boolean, },
];

export default function setupNextRuntime(argv: string[]) {

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

  // Next.js version. If we want to override.
  let nextVersion: string | null = null;
  {
    const optionValue = commandLineOptions['next-version'];
    if (typeof optionValue === 'string' && optionValue !== '') {
      nextVersion = optionValue;
    }
  }
  // override next runtime
  let nextRuntimeOverride: string | null = null;
  {
    const optionValue = commandLineOptions['next-runtime'];
    if (typeof optionValue === 'string') {
      nextRuntimeOverride = optionValue;
      nextVersion = null;
    }
  }
  // run update on package.json
  let updatePackageJson: boolean | null = null;
  {
    const optionValue = commandLineOptions['update-package-json'];
    if (typeof optionValue === 'boolean') {
      updatePackageJson = optionValue;
    }
  }

  const computeJsDir = path.resolve(NEXT_COMPUTE_JS_DIRECTORY_NAME);
  if (!fs.existsSync(computeJsDir)) {
    console.log(`❌ @fastly/next-compute-js Compute@Edge project directory '${computeJsDir}' must exist. Try running 'init' command first.`);
    process.exit(1);
  }

  if (nextRuntimeOverride != null) {
    if (nextRuntimeOverride === '') {
      console.log('ℹ️ Skipping Next.js runtime installation');
    } else {
      console.log(`ℹ️ Next.js runtime override specified: '${nextRuntimeOverride}'`);
    }
  } else {
    if (nextVersion == null) {
      // load package.json
      let packageJson: any;
      try {
        packageJson = loadPackageJson();
      } catch(ex) {
        throw new Error("Can't load package.json in current directory.", { cause: ex });
      }

      nextVersion = getInstalledNextVersion(packageJson);
    }

    validateSupportedNextVersion(nextVersion);
  }

  const computeJsPackageJson = loadPackageJson(computeJsDir);

  const status = findNextComputeJsServerLibStatus(computeJsPackageJson, nextVersion);
  let packageJsonModified = false;

  if (status.dependenciesToRemove.length > 0) {
    for (const dep of status.dependenciesToRemove) {
      console.log(`Removing dependency: '${dep}'`);
      delete computeJsPackageJson.dependencies[dep];
    }
    packageJsonModified = true;
  }
  if (status.devDependenciesToRemove.length > 0) {
    for (const dep of status.devDependenciesToRemove) {
      console.log(`Removing devDependency: '${dep}'`);
      delete computeJsPackageJson.devDependencies[dep];
    }
    packageJsonModified = true;
  }
  if (status.devDependenciesToAdd.length > 0) {
    if (computeJsPackageJson.devDependencies == null) {
      computeJsPackageJson.devDependencies = {};
    }
    for (const dep of status.devDependenciesToAdd) {
      console.log(`Adding devDependency: '${dep}'`);
      computeJsPackageJson.devDependencies[dep] = '*';
    }
    packageJsonModified = true;
  }

  if (packageJsonModified) {
    console.log(`Writing modified package.json in '${computeJsDir}'`);
    writePackageJson(computeJsPackageJson, computeJsDir);

    console.log('Applying updated dependencies...');
    console.log(`npm --prefix ${computeJsDir} install`);
    child_process.spawnSync('npm', [ '--prefix', computeJsDir, 'install' ], { stdio: 'inherit' });
    console.log('');
  }

  if (nextRuntimeOverride != null && nextRuntimeOverride !== '') {
    console.log('Installing Next.js runtime override...');
    console.log(`npm --prefix ${computeJsDir} install --save-dev "${nextRuntimeOverride}"`);
    child_process.spawnSync('npm', [ '--prefix', computeJsDir, 'install', '--save-dev', nextRuntimeOverride ], { stdio: 'inherit' });
    console.log('');
  }

  if (updatePackageJson) {
    console.log('Updating package.json...');
    console.log(`npm --prefix ${computeJsDir} --save update`);
    child_process.spawnSync('npm', [ '--prefix', computeJsDir, '--save', 'update' ], { stdio: 'inherit' });
    console.log('');
  }

}

function displayHelp() {
  console.log(`\
next-compute-js: Run your Next.js application on Compute@Edge JavaScript.

Sets up or updates the Compute@Edge Next.js Server Runtime library.

Usage:
  npx @fasty/next-compute-js setup-next-runtime [<flags>]

Flags:
  --next-version=<name>                - Specifies an override Next.js version to use.
  --next-runtime=<pathspec-or-version> - Specifies an override next runtime to initialize
                                         application with. If specified, ignores --next-version.
  --update-package-json                - Runs npm update at the end of the process.                                         
`);
}
