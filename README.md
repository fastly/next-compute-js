# Next.js on Compute@Edge

Deploy and serve your [Next.js](https://nextjs.org) website from Fastly's [Compute@Edge](https://developer.fastly.com/learning/compute/) platform.

> NOTE: `@fastly/next-compute-js` is provided as a Fastly Labs product. Visit the [Fastly Labs](https://www.fastlylabs.com/) site for terms of use.

> NOTE: This is a prerelease version of this tool. For the current version, [click here](https://github.com/fastly/next-compute-js/tree/main).

## New! Version 2

With Version 2, `@fastly/next-compute-js` has been rebuilt from the ground up, with the following features:

* Adds support for Next.js 13.
  * Supported versions are 12.3.0 through 13.4.6. 
    * Note: The [App Router](https://nextjs.org/docs/app) is not yet supported. 
  * New modular design allows us to build support for new versions more easily.
  * Adds support for React 18's streaming rendering mode.
* A new server layer that simulates Vercel's Middleware / Cache / Functions architecture.
  * Adds support for Edge SSR / Edge API Routes by specifying the `edge` runtime.
  * Adds support for Edge Middleware.
  * Adds support for Incremental Static Regeneration, with support for On-demand Revalidation and Draft Mode (as well as Preview Mode).

### Upgrading

Version 2 is more full-featured, is more stable, and works completely differently from the previous version.
There is no migration path at the current time. You'll need to re-scaffold your application. When you do this, make sure
you may want to keep a note of the fastly.toml file if it configures your service ID.

## Next.js

Next.js is a popular JavaScript-based server framework that gives the developer a great experience –
the ability to write in [React](https://reactjs.org) for the frontend, and a convenient and intuitive way to set up some of the best features
you need for production: hybrid static & server rendering, smart bundling, route prefetching, and more, with very little
configuration needed.

## This library

This library works by packaging the build artifacts from your Next.js site into a scaffolded Compute@Edge application
that simulates the Vercel runtime environment, mainly using these libraries:

* [`@fastly/serve-vercel-build-output`](https://github.com/fastly/serve-vercel-build-output) - A server implementation
  for Compute@Edge that simulates Vercel's Middleware / Cache / Functions infrastructure. It uses Fastly KV Store for
  caching.
* [`@fastly/next-compute-js-server-x.x.x`](https://github.com/fastly/next-compute-js-server) - A custom implementation of
  the `NextServer` class provided by Next.js designed to work on Compute@Edge. Note that the `x.x.x` part of the name of
  the library you use lines up with the specific version of Next.js used by your project (See [details](#next-compute-js-server)).
* [`@fastly/compute-js-static-publish`](https://github.com/fastly/compute-js-static-publish) - A library that provides runtime
  access to the build artifacts packaged in the Compute@Edge application.

## Usage

Prerequisites:

* [Fastly CLI](https://developer.fastly.com/learning/tools/cli/), version >= 9.0.0
* [Node.js](https://nodejs.org/) >= 16
* [Next.js](https://nextjs.org/) 12.3.0 through 13.4.6

Follow these steps:

* [Develop your site](#develop-your-site)
* [Create your Compute@Edge project](#create-compute-js)
* [Set up Compute@Edge Next.js Server Runtime library](#next-compute-js-server)
* [Configuration](#configuration)
* [Test the project locally](#testing-locally)
* [Deploy the project to your Fastly service](#deploy-to-fastly)

### Develop your site

Use [create-next-app](https://nextjs.org/docs) (or [any alternative method](https://nextjs.org/docs/getting-started/installation#manual-installation))
to set up your Next.js app.

> NOTE: Currently supported versions of Next.js are 12.3.0 through 13.4.6.

> NOTE: The current version does not support Next.js 13's [App Router](https://nextjs.org/docs/app).
> When `create-next-app` prompts you whether to use App Router, you must decline.

> HINT: We have some examples that showcase some of the features that we support, available at https://github.com/fastly/nextjs-examples.
> Feel free to check out the code and try them out on your local environment or your Fastly Service.

Directory Structure:
```
my-next-app/                 - Project root
  package.json               - Project manifest file
  next.config.js             - Next.js config file
  src/                       - Project source files
    pages/                   - Pages routed files
      api/
        *.js                 - API route handlers
      *.js                   - React source files
    styles/
      *.css                  - CSS files
      *.module.css           - CSS modules  
  public/
    *                        - Public files
  .gitignore
  ...other files
```

Build your site normally as you would in Next.js, and use its built-in development server during
development:

```shell
npm run dev
```

### <a name='create-compute-js'></a> Create your Compute@Edge project

> HINT: Since this is a prerelease version, you'll need to add @fastly/next-compute-js to your project.
> 
> Add `@fastly/next-compute-js` to your project:
> 
> ```shell
> npm install @fastly/next-compute-js@alpha
> ```

In your project directory, type the following command to scaffold a Compute@Edge project:

```shell
npx @fastly/next-compute-js init
```

This will result in a `./next-compute-js` directory, initialized with application files.

Directory Structure:
```
my-next-app/                 - Project root
  next-compute-js/           - Scaffolded Compute@Edge program
    src/index.js             - Compute@Edge entry point
    package.json             - Project manifest file
    server.config.json       - Compute@Edge specific config options
    fastly.toml              - Fastly Compute@Edge manifest
    static-publish.rc.js     - ComputeJS Static Publisher config file
    webpack.config.js        - Webpack config file
    .gitignore
    tsconfig.json
```

You should commit this directory to your source control, especially if you intend to make customizations
to any of the config files.

The program also updates your project's package.json file, adding the fastly-serve and fastly-deploy scripts.

The program then automatically moves on to set up the Next.js runtime automatically (next step).

### <a name="next-compute-js-server"></a> Set up Compute@Edge Next.js Server Runtime library

Next.js is under active development, and receives frequent updates that make changes to its internals. Unfortunately,
this causes incompatibilities between our custom implementation and the classes provided by Next.js.

Therefore, Fastly provides a specific runtime library for every supported version of Next.js.
> For example, if you're using Next.js 13.4.6, the corresponding version is `@fastly/next-compute-js-server-13.4.6`.

Fortunately, we've automated the process: this step will automatically install the correct library that matches your Next.js
version (this step will happen automatically after scaffolding your application, but you may run it manually
at a later time if you change the version of Next.js).

From inside the Next app's root directory, type the following:

```shell
npx @fastly/next-compute-js setup-next-runtime
```

The program examines the version of Next.js used by your app, and adds the appropriate runtime library to the
Compute@Edge application, or displays an error message if you are running an unsupported version of Next.js.

### Configuration

In addition to any configuration that applies to your Next.js application in terms of `next.config.js`, you may need to
configure the following aspects of your Compute@Edge application.

#### Backends

A [Fastly backend](https://developer.fastly.com/reference/glossary#term-backend) refers to a label for any external domain
that your application needs to perform HTTP calls to at runtime. 

They are used in for two purposes:

1. If any of the server-side code (for example, `getServerSideProps` and some uses of `getStaticProps`) needs to perform
any fetch operations to an external backend, you must apply the backend to the initialization code for the fetch:

```javascript
async function getStaticProps({ params  }) {
    const res = await fetch("https://http-me.glitch.me/anything", {
        backend: "http-me" // This is the backend name
    });
    const body = await res.text();
    return {
        props: {
            body
        }
    };
}
```

2. If any of the rewrites defined in your Next.js config would proxy to an external server, then specify the backend for
each domain by adding them to `server.config.js`. This enables the proxying by looking up the backend name `'http-me'`
based on the URL during a proxy.

```javascript
/** @type {import('@fastly/serve-vercel-build-output').ServerConfig} */
const config = {
  backends: {
    'http-me': { url: 'https://http-me.glitch.me/' },
  },
};
```

To use the backend in the development environment, add the
[Backend definition](https://developer.fastly.com/reference/compute/fastly-toml/#backends) to your `fastly.toml` file.

To use the backend in your Fastly service, add the Backend in the Fastly application at https://manage.fastly.com/.

#### KV Store for caching

The server simulates Vercel's cache infrastructure by caching responses in Fastly KV Store. For the local development
environment, the application always uses the KV Store named "local-kvcache", and no further configuration is necessary.

To use a KV Store in your Fastly service, you'll need to create one and link it to your service, following the steps described in
[the Developer Hub on this page](https://developer.fastly.com/learning/concepts/data-stores/#kv-stores).

For example, use the following commands to add a KV Store and link it to your service.

```shell
# Create a KV store
% curl -i -X POST "https://api.fastly.com/resources/stores/kv" \
-H "Fastly-Key: YOUR_FASTLY_TOKEN" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"name": "example-store"}'

# You'll get back an ID for your KV Store.

# Link the store to a service
% curl -i -X POST "https://api.fastly.com/service/YOUR_FASTLY_SERVICE_ID/version/YOUR_FASTLY_SERVICE_VERSION/resource" \
-H "Fastly-Key: YOUR_FASTLY_TOKEN" \
-H "Content-Type: application/x-www-form-urlencoded" \
-H "Accept: application/json" \
-d "name=your-app-kv-store&resource_id=YOUR_KV_STORE_ID"
```

Then, use the `server.config.js` to configure the application with the KV Store. Specify the name of the resource link.

```javascript
/** @type {import('@fastly/serve-vercel-build-output').ServerConfig} */
const config = {
  cachingKvStore: 'your-app-kv-store',
};
```

### <a name="running-locally"></a> Test the project locally

You can run your Compute@Edge application in
[Fastly's local development environment](https://developer.fastly.com/learning/compute/testing/#running-a-local-testing-server).

After initializing your project and setting up the runtime, from inside the Next app's root directory, type the following:

```shell
npm run fastly-serve
```

The process will build your Next.js project, then switch to the `next-compute-js` directory, build and package the
Compute@Edge application to Wasm, and then start the Fastly development environment.

It will be possible to browse to your local site by accessing http://localhost:7676/.

Remember that each time you make changes to your source files, you will need to stop the server and re-run this process
to build a new Wasm binary to run in the Development environment.

For details on how building the project works, see [How it works](#how-it-works) below.

### <a name="deploy-to-fastly"></a> Deploy the project to your Fastly service

When you're ready to deploy your site to Compute@Edge, from inside the Next app's root directory, type the following:

```shell
npm run fastly-deploy
```

The process will build your Next.js project, then switch to the `next-compute-js` directory, build and package the Compute@Edge
application to Wasm, and then [start the deployment process to your Fastly service](https://developer.fastly.com/learning/compute/#deploy-the-project-to-a-new-fastly-service).

If you haven't already created a service for your application, you will be prompted for your service's
details. Alternatively, you can [populate `fastly.toml` yourself](https://developer.fastly.com/reference/compute/fastly-toml/)
to specify an existing service.

For details on how building the project works, see [How it works](#how-it-works) below.

#### Configuring the application

If the Server-Side parts of your application need any access to backends while running on the local development server,
[define them](https://developer.fastly.com/reference/compute/fastly-toml/) in the `fastly.toml` file.


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
* `<Link>` object
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
* `<Image>` tags
* Headers
* MDX
* Custom App
* Custom Document
* Custom Error Page
* Preview Mode
* API Routes / Middleware
* Edge API Routes / Middleware
* Incremental Static Regeneration

The following are not supported at the current time:

* App Router
* Dynamic Import
* Image Optimization (Image tags are supported, but the images are not optimized)

### API Routes / Middleware

We support [API Routes and Middleware](https://nextjs.org/docs/api-routes/introduction). The handlers in your application
will receive Node.js-style request and response objects that have Next.js [Request](https://nextjs.org/docs/api-routes/request-helpers)
and [Response](https://nextjs.org/docs/api-routes/response-helpers) helpers applied to them.

### Edge SSR Rendering / Edge API Routes / Middleware

We support [Edge SSR rendering](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes#edge-runtime).

We support [Edge API Routes](https://nextjs.org/docs/api-routes/edge-api-routes) and
[Middleware](https://nextjs.org/docs/advanced-features/middleware) as well.

### MDX

It's possible to use MDX by following the directions on this page on the Next.js
website: [Using MDX with Next.js](https://nextjs.org/docs/advanced-features/using-mdx).

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/next-compute-js/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](./SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](./LICENSE).
