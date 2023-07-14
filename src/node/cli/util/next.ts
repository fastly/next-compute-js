/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import fs from 'fs';
import process from 'process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const NEXT_COMPUTE_JS_SERVER_LIB_PREFIX = '@fastly/next-compute-js-server-';

// List of all supported 'next' versions.
// The keys represent the supported versions, the values represent the 'x.x.x' portion of
// the '@fastly/next-compute-js-server-x.x.x' library to use with that version of Next.js.
const SUPPORTED_NEXT_JS_VERSION_MAPPINGS: Record<string, string | true> = {
  '12.3.0': true,
  '12.3.1': true,
  '12.3.2': '12.3.1',
  '12.3.3': true,
  '12.3.4': '12.3.3',
  '13.0.0': true,
  '13.0.1': true,
  '13.0.2': '13.0.0',
  '13.0.3': true,
  '13.0.4': '13.0.3',
  '13.0.5': '13.0.3',
  '13.0.6': '13.0.3',
  '13.0.7': true,
  '13.1.0': '13.0.7',
  '13.1.1': '13.0.7',
  '13.1.2': '13.0.7',
  '13.1.3': true,
  '13.1.4': '13.1.3',
  '13.1.5': '13.1.3',
  '13.1.6': true,
  '13.2.0': true,
  '13.2.1': '13.2.0',
  '13.2.2': true,
  '13.2.3': '13.2.2',
  '13.2.4': true,
  '13.3.0': true,
  '13.3.1': true,
  '13.3.2': true,
  '13.3.3': '13.3.2',
  '13.3.4': '13.3.2',
  '13.4.0': true,
  '13.4.1': true,
  '13.4.2': '13.4.1',
  '13.4.3': true,
  '13.4.4': true,
  '13.4.5': '13.4.4',
  '13.4.6': true,
};

export function buildNextComputeJsServerLibName(nextVersion: string) {
  const libVersion = SUPPORTED_NEXT_JS_VERSION_MAPPINGS[nextVersion] === true ?
    nextVersion : SUPPORTED_NEXT_JS_VERSION_MAPPINGS[nextVersion];
  return `${NEXT_COMPUTE_JS_SERVER_LIB_PREFIX}${libVersion}`;
}

export function validateSupportedNextVersion(nextVersion: string) {
  if (!SUPPORTED_NEXT_JS_VERSION_MAPPINGS[nextVersion]) {
    throw new Error(`\
Unsupported 'next' version: ${nextVersion}. \n
Supported versions are: ${Object.keys(SUPPORTED_NEXT_JS_VERSION_MAPPINGS).join(', ')}`);
  }
}

export function getInstalledNextVersion(packageJson: any) {

  let isNextInstalled;
  try {
    isNextInstalled = Object.keys(packageJson.dependencies ?? {}).includes('next');
  } catch {
    isNextInstalled = false;
  }

  if(!isNextInstalled) {
    throw new Error(`The module 'next' was not found in the 'dependencies' field of 'package.json'.`);
  }

  let nextPackageJsonFilepath;
  try {
    nextPackageJsonFilepath = require.resolve('next/package.json', { paths: [process.cwd()] });
  } catch(ex) {
    throw new Error(`Unable to find 'next/package.json'.`, { cause: ex });
  }

  let nextPackageJson;
  try {
    const nextPackageJsonContent = fs.readFileSync(nextPackageJsonFilepath, 'utf-8');
    nextPackageJson = JSON.parse(nextPackageJsonContent);
  } catch(ex) {
    throw new Error(`Unable to read '${nextPackageJsonFilepath}'.`, { cause: ex });
  }

  const nextPackageJsonVersion = nextPackageJson.version;
  if (typeof nextPackageJsonVersion !== 'string') {
    throw new Error(`'version' field of '${nextPackageJsonFilepath}' was expected to be a string, saw '${nextPackageJsonVersion}'.`);
  }

  return nextPackageJsonVersion;

}

export type NextComputeJsServerLibStatus = {
  dependenciesToRemove: string[],
  devDependenciesToRemove: string[],
  devDependenciesToAdd: string[],
};

// Find what to do with @fastly/next-compute-js-server-x.x.x libraries
export function findNextComputeJsServerLibStatus(
  packageJson: Record<string, any>,
  nextVersion: string | null,
): NextComputeJsServerLibStatus {

  const libToKeep = nextVersion != null ? buildNextComputeJsServerLibName(nextVersion) : null;

  // The libraries should not exist in dependencies at all
  const dependenciesToRemove = Object.keys(packageJson.dependencies ?? {})
    .filter(dep => dep.startsWith(NEXT_COMPUTE_JS_SERVER_LIB_PREFIX));

  // Find the devDependencies that match the library name format
  const devDependencies = Object.keys(packageJson.devDependencies ?? {})
    .filter(dep => dep.startsWith(NEXT_COMPUTE_JS_SERVER_LIB_PREFIX));

  const devDependenciesToRemove = devDependencies
    .filter(dep => dep !== libToKeep);

  const devDependenciesToAdd: string[] = [];
  if (libToKeep != null) {
    if (!devDependencies.includes(libToKeep)) {
      devDependenciesToAdd.push(libToKeep);
    }
  }

  return {
    dependenciesToRemove,
    devDependenciesToRemove,
    devDependenciesToAdd,
  };

}
