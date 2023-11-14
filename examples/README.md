# Next.js examples

The example(s) under this directory are example projects that can be run under Compute by using
`@fastly/next-compute-js`.

They are not ready-to-run Compute projects, rather, they are source files that follow Next.js
project structures. They are meant to illustrate that they can be run as normal using the Next.js
development server, and can also be run under Compute by using `@fastly/next-compute-js`.

For example, to run `my-app` in the Next.js development server , you would run the following commands:

```shell
cd my-app                              # switch to the directory
npm install                            # install dependencies
npm run dev                            # run the app in Next.js dev server (Press Ctrl+C to exit)
```

Then, to run it under Compute, run the following:

```shell
npm run build                          # build Next.js application for production
npx @fastly/next-compute-js            # scaffold Compute app
cd compute-js && fastly compute serve  # run the app in Fastly's test environment
```

If you make changes to the project files, you'll need to rebuild the Next.js application
and then restart the server:

```shell
# Press Ctrl+C to stop Fastly's test environment if it's already running
npm run build                          # build Next.js application for production
cd compute-js && fastly compute serve  # run the app in Fastly's test environment
```
