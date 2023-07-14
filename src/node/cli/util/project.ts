/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { loadPackageJson } from './package.js';
import path from 'path';

// Find project name from current directory.
// Uses current directory's package.json, and if not defined there,
// it uses the current directory's name.
// This should only be called in a directory that includes a package.json
// even if it ends up not getting the value from there.
export function findProjectName() {

  try {
    const packageJson = loadPackageJson();
    if (
      typeof packageJson.name === 'string' &&
      packageJson.name !== ''
    ) {
      return packageJson.name;
    }
  } catch(ex) {
    throw new Error("Can't load package.json in current directory.", { cause: ex });
  }

  // Get the last segment of the current working directory.
  return path.dirname(path.resolve());

}
