const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.js",
  optimization: {
    minimize: false,
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
      {
        // asset/source exports the source code of the asset.
        resourceQuery: /staticText/,
        type: "asset/source",
      },
      {
        // asset/inline exports the raw bytes of the asset.
        // We base64 encode them here
        resourceQuery: /staticBinary/,
        type: "asset/inline",
        generator: {
          /**
           * @param {Buffer} content
           * @returns {string}
           */
          dataUrl: content => {
            return content.toString('base64');
          },
        }
      },
    ],
  },
  plugins: [
    // Polyfills go here.
    // Used for, e.g., any cross-platform WHATWG,
    // or core nodejs modules needed for your application.
    new webpack.ProvidePlugin({
      Buffer: [ "buffer", "Buffer" ],
      process: 'process',
      setTimeout: [ 'local-polyfill', 'setTimeout' ],
    }),
    new webpack.EnvironmentPlugin({
      NEXT_RUNTIME: 'edge',
      NEXT_PRIVATE_MINIMAL_MODE: false,
    }),
  ],
  resolve: {
    alias: {
      'local-polyfill': path.resolve(__dirname, "./src/polyfill"),
    },
    fallback: {
      "buffer": require.resolve("buffer/"),
      "path": require.resolve("path-browserify"),
      "process": require.resolve("process/browser"),
      "url": require.resolve("url/"),
    }
  },
};
