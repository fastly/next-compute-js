/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';

const COMPUTE_JS_DIR = './compute-js';

// Directory structure looks weird, but /src gets compiled to /build/src,
// so are one layer deeper
const RESOURCES_DIR = '../../../resources';

export function checkServerProject() {
  const computeJsDir = path.resolve(COMPUTE_JS_DIR);
  return fs.existsSync(computeJsDir);
}

type CopyOptions = {
  toFileName?: string,
  templateContext?: object,
};

export function copyResourceFile(filePath: string, src: string, target: string, opts?: CopyOptions) {
  const srcFilePath = path.resolve(__dirname, RESOURCES_DIR, src, filePath);
  let targetFilePath = path.resolve(target, filePath);
  if(opts?.toFileName != null) {
    targetFilePath = path.join(path.dirname(targetFilePath), opts.toFileName);
  }
  if(opts?.templateContext != null) {
    console.log(srcFilePath + ' -> ' + targetFilePath + ' (template)');
    const srcFile = fs.readFileSync(srcFilePath, 'utf-8');
    const destFile = nunjucks.renderString(srcFile, opts.templateContext);
    fs.writeFileSync(targetFilePath, destFile, 'utf-8');
  } else {
    console.log(srcFilePath + ' -> ' + targetFilePath);
    fs.copyFileSync(srcFilePath, targetFilePath);
  }
}

export function generateServerProject() {

  if(checkServerProject()) {
    console.error(`❌ '${COMPUTE_JS_DIR}' directory already exists!`);
    process.exit(1);
  }

  let packageJsonContent: string | null;
  try {
    const packageJsonPathname = path.resolve('./package.json');
    packageJsonContent = fs.readFileSync(packageJsonPathname, 'utf-8');
  } catch {
    console.error('❌ package.json not found in current directory.');
    process.exit(1);
  }

  let packageJson: any;
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch {
    console.error('❌ Unable to parse package.json in current directory.');
    process.exit(1);
  }

  let name: string;
  if(packageJson.name != null) {
    name = packageJson.name + '-next-compute-js-app';
  } else {
    name = "next-compute-js-app";
    console.warn(`package.json does not define a 'name'. Using default name: ${name}`);
  }

  const computeJsDir = path.resolve(COMPUTE_JS_DIR);
  console.log("Initializing Compute@Edge Application in " + computeJsDir + "...");
  console.log("Application name: " + name);
  fs.mkdirSync(computeJsDir);
  fs.mkdirSync(path.resolve(computeJsDir, './src'));

  // Copy resource files
  const files = [
    'src/index.js',
    ['_gitignore', '.gitignore'],
    '.nvmrc',
    '.npmrc',
    'default-content-types.cjs',
    ['fastly.toml.njk', 'fastly.toml'],
    ['package.json.njk', 'package.json'],
    'static-publish.rc.js',
    'webpack.config.js',
  ];
  for (const file of files) {
    let fromFile: string;
    let copyOpts: CopyOptions = {};
    if(Array.isArray(file)) {
      [fromFile, copyOpts.toFileName] = file;
    } else {
      fromFile = file;
    }
    if(fromFile.endsWith('.njk')) {
      copyOpts.templateContext = {
        appName: name,
      };
    }
    copyResourceFile(fromFile, 'compute-js', computeJsDir, copyOpts);
  }

  console.log("🚀 Compute@Edge application created!");

  console.log('Installing dependencies...');
  console.log(`npm --prefix ${COMPUTE_JS_DIR} install`);
  child_process.spawnSync('npm', [ '--prefix', COMPUTE_JS_DIR, 'install' ], { stdio: 'inherit' });
  console.log('');

  console.log('');
  console.log('To run your Compute@Edge application locally:');
  console.log('');
  console.log('  cd ' + COMPUTE_JS_DIR);
  console.log('  fastly compute serve');
  console.log('');
  console.log('To build and deploy to your Compute@Edge service:');
  console.log('');
  console.log('  cd ' + COMPUTE_JS_DIR);
  console.log('  fastly compute publish');
  console.log('');
}
