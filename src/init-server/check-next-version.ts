const { sync } = require('pkg-up');

// TODO: Add to this table every time we release
// The keys are Next.js versions, and the values are the newest
// version of next-compute-js that is compatible with that version.

const newestVersion = '0.3.1';

const versionMatrix: Map<string, string> = new Map<string, string>([
  ['12.2.2', '0.1.1-beta.4'],
  ['12.2.4', '0.2.5'],
  ['12.2.5', '0.2.5'],
  ['12.3.0', newestVersion],
]);

const newestNextjsVersion = [...versionMatrix.keys()].pop();

export function checkNextVersion() {

  let nextFile: string;
  try {
    nextFile = require.resolve('next');
  } catch {
    console.error('This program requires Next.js');
    process.exit(1);
  }

  let nextVersion: string | undefined;
  try {
    const packageJson = require(sync({cwd: nextFile}));
    nextVersion = packageJson.version as string;
  } catch {
    console.warn('Could not determine version of Next.js.');
    nextVersion = undefined;
  }

  if (nextVersion != null) {
    const compatibleVersionInfo = versionMatrix.get(nextVersion);
    console.log('Next.js version: ' + nextVersion);
    if(compatibleVersionInfo != null) {
      if(compatibleVersionInfo === newestVersion) {
        return;
      } else {
        console.warn('The current version of next-compute-js does not support this version of Next.js.');
        console.warn('Consider using @fastly/next-compute-js@' + compatibleVersionInfo + '.');
      }
    } else {
      console.warn('@fastly/next-compute-js does not support this version of Next.js.');
      console.warn('The version of Next.js supported is: ' + newestNextjsVersion);
    }
  }
  console.warn('If you have trouble, try updating your installed version of @fastly/next-compute-js, or');
  console.warn('check the README on GitHub at https://github.com/fastly/next-compute-js.');
}
