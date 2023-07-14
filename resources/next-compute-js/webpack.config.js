const path = require("path");
const webpack = require("webpack");

const { applyWebpackTransform } = require("@fastly/serve-vercel-build-output/dist/node/webpack/transform");

module.exports = {
  mode: 'production',
  experiments: {
    topLevelAwait: true,
  },
  entry: "./src/index.js",
  optimization: {
    minimize: false,
  },
  target: "webworker",
  performance: {
    hints: false,
    maxEntrypointSize: 10240000,
    maxAssetSize: 10240000,
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "bin"),
    libraryTarget: "this",
  },
  module: {
    rules: [
      // Loaders go here.
      // e.g., ts-loader for TypeScript
    ],
  },
  plugins: [
    // Polyfills go here.
    // Used for, e.g., any cross-platform WHATWG,
    // or core nodejs modules needed for your application.
    // new webpack.ProvidePlugin({
    // }),
  ],
  externals: [
    ({request,}, callback) => {
      // Allow Webpack to handle fastly:* namespaced module imports by treating
      // them as modules rather than try to process them as URLs
      if (/^fastly:.*$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
};

// Allow plugins to apply transforms
module.exports = applyWebpackTransform(module.exports, webpack);
