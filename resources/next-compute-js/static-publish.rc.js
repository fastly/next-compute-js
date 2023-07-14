/** @type {import('@fastly/compute-js-static-publish').StaticPublisherConfig} */
module.exports = {
  rootDir: './.build',
  excludeDirs: [],
  excludeDotFiles: false,
  includeDirs: [],
  staticDirs: [],
  contentAssetInclusionTest(path) {
    if (
      path.endsWith('/functions/') && (
        path.endsWith('/.vc-config.json') ||
        path.endsWith('.prerender-config.json')
      )
    ) {
      return 'inline';
    }
    if (path.endsWith('/BUILD_ID')) {
      return 'inline';
    }
    if (path === '/builds.json') {
      return false;
    }
    return true;
  },
  moduleAssetInclusionTest(path) {
    if (
      (path.startsWith('/init/') || path.startsWith('/lib/') || path.startsWith('/functions/')) &&
      (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs'))
    ) {
      return true;
    }
    return false;
  },
  contentTypes: [
    { test: /\/BUILD_ID$/, contentType: 'application/x-next-build-id', text: true },
  ],
};
