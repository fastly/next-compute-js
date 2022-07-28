module.exports = {
  publicDir: "../",
  excludeDirs: [ './node_modules', './compute-js', './.next/cache' ],
  includeDirs: [ './.next', './static', './public' ],
  staticDirs: [],
  excludeTest: function(path) {
    return path.indexOf('/.next/cache/') !== -1;
  },
  moduleTest: function(path) {
    return path.indexOf('/.next/server/') !== -1 && !path.endsWith('.html') && !path.endsWith('.map');
  },
  spa: false,
  autoIndex: [],
  autoExt: [],
};
