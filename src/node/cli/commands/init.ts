/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

import commandLineArgs from 'command-line-args';

import {
  NEXT_COMPUTE_JS_DIRECTORY_NAME,
} from "../constants.js";
import {
  getInstalledNextVersion,
  validateSupportedNextVersion,
} from '../util/next.js';
import {
  copyResourceFile,
  CopyResourceFileOptions,
} from '../util/file.js';
import {
  loadPackageJson,
  writePackageJson,
} from '../util/package.js';

const RESOURCES_DIR = '../../../../resources';

const OPTION_DEFINITIONS: commandLineArgs.OptionDefinition[] = [
  { name: 'help', type: Boolean, },
  { name: 'app-name', type: String, },
  { name: 'service-id', type: String, },
  { name: 'next-runtime', type: String, },
];

export default function init(argv: string[]) {

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

  // Build project name. It comes from:
  // - Command line option '--project-name=<value>'
  // - Current project.json's name field
  // - Current project's directory name
  let appName: string | null = null;
  {
    const optionValue = commandLineOptions['app-name'];
    if (typeof optionValue === 'string' && optionValue !== '') {
      appName = optionValue;
    }
  }
  // service ID
  let serviceId = '';
  {
    const optionValue = commandLineOptions['service-id'];
    if (typeof optionValue === 'string' && optionValue !== '') {
      serviceId = optionValue;
    }
  }
  // override next runtime
  let nextRuntimeOverride = null;
  {
    const optionValue = commandLineOptions['next-runtime'];
    if (typeof optionValue === 'string') {
      nextRuntimeOverride = optionValue;
    }
  }

  // load package.json
  let packageJson: any;
  try {
    packageJson = loadPackageJson();
  } catch(ex) {
    throw new Error("Can't load package.json in current directory.", { cause: ex });
  }

  if (appName == null) {
    if (typeof packageJson.name === 'string' && packageJson.name !== '') {
      appName = `${packageJson.name}-computejs-app`;
    }
  }
  if (appName == null) {
    // Get the last segment of the current working directory.
    const dirname = path.dirname(path.resolve());
    appName = `${dirname}-computejs-app`;
  }

  if (nextRuntimeOverride != null) {
    if (nextRuntimeOverride === '') {
      console.log('ℹ️ Skipping Next.js runtime installation');
    } else {
      console.log(`ℹ️ Using Next.js runtime '${nextRuntimeOverride}'`);
    }
  } else {
    // Check to make sure we have one of the allowed 'next' versions
    try {
      const nextVersion = getInstalledNextVersion(packageJson);
      validateSupportedNextVersion(nextVersion);
    } catch(ex) {
      console.log('Failed prerequisite');
      if (ex instanceof Error) {
        console.log(ex.message);
      }
      return;
    }
  }

  const computeJsDir = path.resolve(NEXT_COMPUTE_JS_DIRECTORY_NAME);
  if (fs.existsSync(computeJsDir)) {
    console.log(`❌ @fastly/next-compute-js Compute@Edge project directory '${computeJsDir}' already exists.`);
    process.exit(1);
  }

  console.log(`Initializing Compute@Edge Application in '${computeJsDir}'...`);
  console.log(`Application name: ${appName}`);
  fs.mkdirSync(computeJsDir);
  fs.mkdirSync(path.resolve(computeJsDir, './src'));

  // Copy resource files over
  const srcDirectory = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    RESOURCES_DIR,
    'next-compute-js',
  );

  const files = [
    'src/index.js',
    ['_gitignore', '.gitignore'],
    ['fastly.toml.njk', 'fastly.toml'],
    ['package.json.njk', 'package.json'],
    'server.config.js',
    'static-publish.rc.js',
    'tsconfig.json',
    'webpack.config.js',
  ];
  for (const file of files) {
    let fromFile: string;
    let copyOpts: CopyResourceFileOptions = {};
    if(Array.isArray(file)) {
      [fromFile, copyOpts.toFileName] = file;
    } else {
      fromFile = file;
    }
    if(fromFile.endsWith('.njk')) {
      copyOpts.templateContext = {
        appName,
        serviceId,
      };
    }

    copyResourceFile(fromFile, srcDirectory, computeJsDir, copyOpts);
  }

  // Add npm scripts for building and serving
  try {
    packageJson.scripts ??= {};
    packageJson.scripts['fastly-build'] = 'npx @fastly/next-compute-js build';
    packageJson.scripts['fastly-serve'] = 'npm run fastly-build && cd next-compute-js && fastly compute serve --verbose';
    packageJson.scripts['fastly-deploy'] = 'npm run fastly-build && cd next-compute-js && fastly compute publish --verbose';

    writePackageJson(packageJson);
  } catch(ex) {
    console.warn(new Error('Warning: Could not write fastly-* scripts to package.json', { cause: ex }));
  }

  try {
    console.log('Running setup-next-runtime');
    const args = [ '@fastly/next-compute-js', 'setup-next-runtime', '--update-package-json' ];
    if (nextRuntimeOverride != null) {
      args.push(`--next-runtime=${nextRuntimeOverride}`);
    }
    child_process.spawnSync('npx', args, { stdio: 'inherit' });
  } catch(ex) {
    console.warn(new Error('Warning: setup-next-runtime did not complete successfully', { cause: ex }));
  }

  console.log(`Application initialized.`);

}

function displayHelp() {
  console.log(`\
next-compute-js: Run your Next.js application on Compute@Edge JavaScript.

Initializes a Compute@Edge application.

Usage:
  npx @fasty/next-compute-js init [<flags>]

Flags:
  --app-name=<name>                    - Sets the application's name in fastly.toml.
  --service-id=<service-id>            - Sets the application's service ID in fastly.toml.
  --next-runtime=<pathspec-or-version> - Specifies an override next runtime to initialize
                                         application with. 
`);
}
