## Next.js on Compute@Edge

Deploy and serve your [https://nextjs.org](Next.js) website from Fastly's blazing-fast [Compute@Edge](https://developer.fastly.com/learning/compute/).

## Usage

Use [https://nextjs.org/docs/getting-started](`create-next-app`) or any normal method to set up your `Next.js` app.

Build your site normally as you would in Next.js, and use Next.js's built-in development server during
development:

```shell
yarn dev
```

When you're ready to deploy your site to Compute@Edge, build your site with the standard build tool:

```shell
yarn build
```

This creates an optimized build of your application and places the output into the `./.next` directory,
that contains all the files generated from your sources.

To run this in Compute@Edge, run:

```shell
npx @fastly/next-compute-js init
```

This will generate a Compute@Edge project for you and place it in a `./compute-js` directory.

This program can then be [served (local development server)](https://developer.fastly.com/learning/compute/testing/#running-a-local-testing-server)
or [published (to compute@edge service)](https://developer.fastly.com/reference/cli/compute/publish/) by using the following commands.

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

Remember that if you ever change your source files, you will have to run `yarn build` again to
update the built files in your `.next` directory.

## Scripts

In order to simplify the process of building and running or publishing your project, we recommend
that you add the following scripts to your `package.json` file.

```
{
  "scripts": {
    "compute-serve": "next build && cd compute-js && fastly compute serve --verbose"
    "compute-publish": "next build && cd compute-js && fastly compute publish --verbose"
  }
}
```

Now, you can use the following commands to run or publish your project:

Local Development:
```shell
yarn compute-serve
```

Deploy to Compute@Edge:
```shell
yarn compute-publish
```

## Configuring the Compute@Edge application

Being a normal Compute@Edge JavaScript application, the generated project contains a
[https://developer.fastly.com/reference/compute/fastly-toml](`fastly.toml`) file.
Before publishing your project, you may want to update the various fields to specify
your project name, the author name, and the service ID.

Additionally, if the Server-Side parts of your application need any access to backends
while running on the local development server, define them here.

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/next-compute-js/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](./SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](./LICENSE).
