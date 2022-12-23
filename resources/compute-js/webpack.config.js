const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.js",
  experiments: {
    topLevelAwait: true
  },
  optimization: {
    minimize: true,
  },
  target: "webworker",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "bin"),
    libraryTarget: "this",
  },
  module: {
    // Asset modules are modules that allow the use asset files (fonts, icons, etc)
    // without additional configuration or dependencies.
    rules: [
      // asset/source exports the source code of the asset.
      // Usage: e.g., import notFoundPage from "./page_404.html"
      {
        test: /\.(txt|html)/,
        type: "asset/source",
      },
    ],
  },
  plugins: [
    // Polyfills go here.
    // Used for, e.g., any cross-platform WHATWG,
    // or core nodejs modules needed for your application.
    new webpack.ProvidePlugin({
      Buffer: [ 'buffer', 'Buffer' ],
      process: 'process',
    }),
    new webpack.EnvironmentPlugin({
      NEXT_RUNTIME: 'edge',
      NEXT_COMPUTE_JS: true,
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
  resolve: {
    alias: {
      'next/dist/compiled/etag': require.resolve('@fastly/next-compute-js/build/src/util/etag'),
      'next/dist/compiled/raw-body': require.resolve('raw-body'),
    },
    fallback: {
      "async_hooks": false,
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify/"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "process": require.resolve("process/browser"),
      "querystring": require.resolve("querystring-es3"),
      "stream": require.resolve("stream-browserify"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "zlib": require.resolve("browserify-zlib"),
    }
  },
  externals: [
    ({request,}, callback) => {
      if (/^fastly:.*$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
};
