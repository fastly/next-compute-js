import path from "path";
import fs from "fs";

const COMPUTE_JS_DIR = './compute-js';

// Directory structure looks weird, but /src gets compiled to /build/src,
// so are one layer deeper
const RESOURCES_DIR = '../../../resources';

export function checkServerProject() {
  const computeJsDir = path.resolve(COMPUTE_JS_DIR);
  return fs.existsSync(computeJsDir);
}

export function copyResourceFile(filePath: string, src: string, target: string) {
  const srcFilePath = path.resolve(__dirname, RESOURCES_DIR, src, filePath);
  const targetFilePath = path.resolve(target, filePath);
  fs.copyFileSync(srcFilePath, targetFilePath);
}

export function generateServerProject() {

  if(checkServerProject()) {
    console.error(`❌ '${COMPUTE_JS_DIR}' directory already exists!`);
    process.exit(1);
  }

  const computeJsDir = path.resolve(COMPUTE_JS_DIR);
  console.log("Initializing Compute@Edge Application in " + computeJsDir + "...");
  fs.mkdirSync(computeJsDir);
  fs.mkdirSync(path.resolve(computeJsDir, './src'));

  // Copy resource files
  const files = [
    'src/index.js',
    'src/polyfill.js',
    '.gitignore',
    '.node-version',
    'default-content-types.cjs',
    'fastly.toml',
    'package.json',
    'static-publish.rc.js',
    'webpack.config.js',
  ];
  for (const file of files) {
    copyResourceFile(file, 'compute-js', computeJsDir);
  }
}
