# Next.js on Compute@Edge

> NOTE: Version 2 is coming soon! It is a substantial update that contains support for additional features:
> * Adds support for Next.js 13. New modular design allows us to build support for new versions more easily.
>   * Note: The [App Router](https://nextjs.org/docs/app) is not yet supported.
> * Adds support for React 18's streaming rendering mode.
> * A new server layer that simulates Vercel's Middleware / Cache / Functions architecture.
>   * Adds support for Edge SSR / Edge API Routes by specifying the `edge` runtime.
>   * Adds support for Edge Middleware.
>   * Adds support for Incremental Static Regeneration, with support for On-demand Revalidation and Draft Mode (as well as Preview Mode).
>
> Check it out at https://github.com/fastly/next-compute-js/tree/v2

Deploy and serve your [Next.js](https://nextjs.org) website from Fastly's blazing-fast [Compute@Edge](https://developer.fastly.com/learning/compute/).

## Next.js

Next.js is a popular JavaScript-based server framework that gives the developer a great experience –
the ability to write in [React](https://reactjs.org) for the frontend, and a convenient and intuitive way to set up some of the best features
you need for production: hybrid static & server rendering, smart bundling, route prefetching, and more, with very little
configuration needed.

## Usage

Use [create-next-app](https://nextjs.org/docs/getting-started) (or [any alternative method](https://nextjs.org/docs/getting-started#manual-setup))
to set up your Next.js app.

Build your site normally as you would in Next.js, and use its built-in development server during
development:

```shell
npm run dev
```

When you're ready to deploy your site to Compute@Edge, build your site with the standard build tool:

```shell
npm run build
````

This creates an optimized build of your application and places the output into the `./.next` directory,
that contains all the files generated from your sources.

To run this in Compute@Edge, run:

```shell
npx @fastly/next-compute-js@latest init
```

This will generate a Compute@Edge project for you and place it in a directory called `./compute-js`.

This program can then be [served (local development server)](https://developer.fastly.com/learning/compute/testing/#running-a-local-testing-server)
or [published (to a Compute@Edge service)](https://developer.fastly.com/learning/compute/#deploy-the-project-to-a-new-fastly-service)
by using the following commands.

Local Development:
```shell
cd ./compute-js
fastly compute serve
```

Deploy to Compute@Edge:
```shell
cd ./compute-js
fastly compute publish
```

Remember that if you ever change your source files, you will have to run `npm run build` again to
update the built files in your `.next` directory.

## Scripts

In order to simplify the process of building and running or publishing your project, we recommend
that you add the following scripts to your `package.json` file.

```
{
  "scripts": {
    "fastly-serve": "next build && cd compute-js && fastly compute serve --verbose",
    "fastly-publish": "next build && cd compute-js && fastly compute publish --verbose"
  }
}
```

Now, you can use the following commands to build, and then run or publish your project:

Local Development:
```shell
npm run fastly-serve
```

Deploy to Compute@Edge:
```shell
npm run fastly-publish
```

## Configuring the Compute@Edge application

Being a Compute@Edge JavaScript application, the generated project contains a
[`fastly.toml`](https://developer.fastly.com/reference/compute/fastly-toml) file.
Before publishing your project, you may want to update the various fields to specify
your project name, the author name, and the service ID.

Additionally, if the Server-Side parts of your application need any access to backends
while running on the local development server, define them here.

## Supported Next.js Features

The following Next.js features are supported:

* Static File Routing
* Static Routed Pages - index routes, nested routes
* Dynamic Routed Pages - dynamic route segments, catch-all, optional catch-all
* Link object
* Router object / Imperative Routing / Shallow Routing
* Static Generation without Data
* Server-Side Generation with Static Props / Static Paths
* Server-Side Rendering with Server-Side Props
* Client-Side fetching
* SWR
* Built-in CSS / CSS Modules
* Compression (gzip)
* ETag generation
* Rewrites
* Redirects
* Internationalized Routing
* Layouts
* Font Optimization
* Headers
* MDX - (See note below)
* Custom App
* Custom Document
* Custom Error Page
* API Routes / Middleware

The following features are not yet supported, but are on the radar:

* Image Optimization
* Preview Mode

The following features are not supported at the current time:

* Edge API Routes / Middleware
* Incremental Static Regeneration
* Dynamic Import

## API Routes / Middleware

We support [API Routes and Middleware](https://nextjs.org/docs/api-routes/introduction). The handlers in your application
will receive Node.js-style request and response objects that have Next.js [Request](https://nextjs.org/docs/api-routes/request-helpers)
and [Response](https://nextjs.org/docs/api-routes/response-helpers) helpers applied to them.

At the current time, [Edge API Routes](https://nextjs.org/docs/api-routes/edge-api-routes) and
[Middleware](https://nextjs.org/docs/advanced-features/middleware) are not supported.

## How it works

Internally this is a custom implementation of the `NextServer` class provided by Next.js.
This implementation uses [`@fastly/compute-js-static-publish`](https://github.com/fastly/compute-js-static-publish)
to load up the files from the filesystem under the `./.next` directory generated by `next build`. 

## Developing

The following lists the directory structure of the tool and the library.

```
src/
  bin/          - entry point for the CLI
  cli/          - The CLI wrapper for the scaffolding tool
  init-server/  - The main code for the scaffolding tool

  index.ts      - The main library export of this library
  server/       - The code of the Next.js server implementation
  types/        - TypeScript types
  util/         - Util functions
  core/         - Compute@Edge core libraries

test/           - Unit tests (in progress)

examples/       - Examples
resources/      - Files in this directory are copied into the output project by the scaffolding tool   
```

## Next.js Versions

Next.js is under active development, and it makes fairly frequent updates to its internals.
Sometimes those changes cause incompatibilities with the current version of `next-compute-js`. 

While newer versions of Next.js _may_ work, this version of `next-compute-js` supports Next.js **12.3.0**.

See the following table for compatibility:

| Next.js version | @fastly/next-compute-js version |
|-----------------|---------------------------------|
| 12.2.2          | 0.1.1-beta.4                    |
| 12.2.4          | 0.2.5                           |
| 12.2.5          | 0.2.5                           |
| 12.3.0          | 0.9.0 (current)                 |

## MDX

It's possible to use MDX by following the directions on this page on the Next.js
website: [Using MDX with Next.js](https://nextjs.org/docs/advanced-features/using-mdx).

The plugin performs its pre-rendering and compilation of MDX during build time,
and for Compute@Edge you will need to exclude the `@next/mdx` plugin itself during
runtime:

```javascript
if (!process.env.NEXT_COMPUTE_JS) {
  // Apply MDX loader only at compile time
  const withMDX = require('@next/mdx')({
    extension: /\.mdx?$/,
    options: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  });
  module.exports = withMDX({
    ...module.exports,
    // Append the default value with md extensions
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  });
}
```

## Troubleshooting

### Error: Cannot find module '@fastly/http-compute-js/dist/polyfill' 

You may see the following problem if you have `@fastly/http-compute-js@0.3.2` installed:
```
[webpack-cli] Error: Cannot find module '@fastly/http-compute-js/dist/polyfill'
```

If so, you can re-scaffold your compute-js application with v0.7.2 or newer.

Or, you can make the following changes to `webpack.config.js`:

* Remove these lines

```diff
     new webpack.ProvidePlugin({
       Buffer: [ 'buffer', 'Buffer' ],
       process: 'process',
-      setTimeout: [ 'timeout-polyfill', 'setTimeout' ],
-      clearTimeout: [ 'timeout-polyfill', 'clearTimeout' ],
     }),
```

* Remove these lines

```diff
     alias: {
-      'timeout-polyfill': require.resolve('@fastly/http-compute-js/dist/polyfill'),
       'next/dist/compiled/etag': require.resolve('@fastly/next-compute-js/build/src/util/etag'),
       'next/dist/compiled/raw-body': require.resolve('raw-body'),
     },
```

### `statics.js` not being built correctly?

If you've recently updated the version of Fastly CLI, please check the build scripts defined in
`fastly.toml` and `package.json`. The currently recommended default values are as follows:

1. `fastly.toml`

The `[scripts.build]` should look like this:
```toml
[scripts]
build = "npm run build"
```

2. `package.json`

The `"scripts"` should contain the following values:

```json
{
    "prebuild": "npx check-next-version && npx @fastly/compute-js-static-publish --build-static --suppress-framework-warnings && webpack",
    "build": "js-compute-runtime ./bin/index.js ./bin/main.wasm",
    "deploy": "npm run build && fastly compute deploy"
}
```

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/next-compute-js/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](./SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](./LICENSE).
