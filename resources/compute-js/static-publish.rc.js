/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

module.exports = {
  publicDir: "../",
  excludeDirs: [ './node_modules', './compute-js', './pages', './.next/cache' ],
  includeDirs: [ './.next', './static', './public' ],
  staticDirs: [],
  excludeTest: function(path) {
    return path.indexOf('/.next/cache/') !== -1;
  },
  moduleTest: function(path) {
    if (path.endsWith('/next.config.js') || path.endsWith('/next.config.mjs')) {
      return true;
    }
    return path.indexOf('/.next/server/') !== -1 && !path.endsWith('.html') && !path.endsWith('.map');
  },
  spa: false,
  autoIndex: [],
  autoExt: [],
};
