/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import path from 'path';
import fs from 'fs';

export function loadPackageJson(dir = '.') {

  // Check that we are in a directory with a package.json
  let packageJsonContent: string | null;
  try {
    const packageJsonPathname = path.resolve(dir, './package.json');
    packageJsonContent = fs.readFileSync(packageJsonPathname, 'utf-8');
  } catch(ex) {
    throw new Error(`package.json not found in directory '${path.resolve(dir)}'.`, { cause: ex });
  }

  let packageJson: any;
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch(ex) {
    throw new Error(`Unable to parse package.json in directory '${path.resolve(dir)}'.`, { cause: ex });
  }

  return packageJson;

}

export function writePackageJson(
  packageJson: Record<string, any>,
  dir = '.'
) {

  const packageJsonPathname = path.resolve(dir, './package.json');

  fs.writeFileSync(
    packageJsonPathname,
    JSON.stringify(packageJson, undefined, 2),
    'utf-8'
  );

}
