import path from "path";
import fs from "fs";
import child_process from "child_process";

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
};

export function copyResourceFile(filePath: string, src: string, target: string, opts?: CopyOptions) {
  const srcFilePath = path.resolve(__dirname, RESOURCES_DIR, src, filePath);
  let targetFilePath = path.resolve(target, filePath);
  if(opts?.toFileName != null) {
    targetFilePath = path.join(path.dirname(targetFilePath), opts.toFileName);
  }
  console.log(srcFilePath + ' -> ' + targetFilePath);
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
    ['_gitignore', '.gitignore'],
    '.node-version',
    '.npmrc',
    'default-content-types.cjs',
    'fastly.toml',
    'package.json',
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
