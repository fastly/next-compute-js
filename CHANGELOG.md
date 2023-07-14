# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Updated

- New architecture for v2
  - This tool is now a scaffolding tool, and creates an app that orchestrates https://github.com/fastly/serve-vercel-build-output and
    https://github.com/fastly/next-compute-js-server to run a Next.js application.
- Adds support for Next.js 13.
- Supported Next.js versions are 12.3.0 through 13.4.6.
  - Note: The [App Router](https://nextjs.org/docs/app) is not yet supported.
- New modular design allows us to build support for new versions more easily.
  - Next.js applications are built as Vercel Build Output, and then executed using https://github.com/fastly/serve-vercel-build-output.  
    - Adds support for Edge SSR / Edge API Routes by specifying the `edge` runtime.
    - Adds support for Edge Middleware.
    - Adds support for Incremental Static Regeneration, with support for On-demand Revalidation and Draft Mode (as well as Preview Mode).
    - Adds support for React 18's streaming rendering mode.
  - A handler for pages and API routes that target 'nodejs' have been moved to https://github.com/fastly/next-compute-js-server.

### Changed

- Switched from yarn to npm.
- Scaffolded application is generated in `next-compute-js/` instead of `compute-js/`.

## [0.9.0] - 2023-02-27

### Updated

- Remove .nvmrc file from generated project
- Remove "engine.node" field from package.json from generated project

## [0.8.1] - 2023-02-27

### Updated

- Move build scripts back to package.json
- Update to @fastly/js-compute@1.3.4
- Update to @fastly/compute-js-static-publish@3.5.0

## [0.8.0] - 2022-12-23

### Updated

- Update to mocha@10.2.0
- Update to @fastly/js-compute@1.0.1
- Update to @fastly/compute-js-static-publish@3.0.1
- Update to @fastly/http-compute-js@0.3.2

### Fixed

- fix: Add static.js to .gitignore

## [0.7.2] - 2022-12-23

### Fix

- fix: Updates to work with @fastly/http-compute-js@0.3.2

## [0.7.1] - 2022-10-22

### Updated

- Update to @fastly/http-compute-js@0.3.1

## [0.7.0] - 2022-10-21

### Updated

- Configure Webpack to always build a single output chunk

## [0.6.0] - 2022-10-21

### Updated

- Update README to specify that the @latest tag should be used when executing @fastly/next-compute-js.
- Update to @fastly/http-compute-js@0.3.0

## [0.5.0] - 2022-10-13

### Updated

- Update to @fastly/compute-js-static-publish@2.2.1, and specify --suppress-framework-warnings
- Update to @fastly/js-compute@0.5.4

## [0.4.1] - 2022-10-11

### Updated

- Update MDX configuration in example to apply MDX loader only at compile time
- Specify Next.js dependency as exact version 12.3.0
- README updates regarding scripts.build

## [0.4.0] - 2022-10-07

### Added

- Added troubleshooting section to README

### Updated

- Build scripts are now handled by scripts.build in fastly.toml
- Update to @fastly/js-compute@0.5.3

## [0.3.1] - 2022-09-20

### Added

- Set default status text ('OK') for 200 status code for static files

### Fixed

- Fix: Make sure response.body exists before attempting to compress it

## [0.3.0] - 2022-09-15

### Updated

- Update to @fastly/http-compute-js@0.2.0

[unreleased]: https://github.com/fastly/next-compute-js/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/fastly/next-compute-js/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/fastly/next-compute-js/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/fastly/next-compute-js/compare/v0.7.2...v0.8.0
[0.7.2]: https://github.com/fastly/next-compute-js/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/fastly/next-compute-js/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/fastly/next-compute-js/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/fastly/next-compute-js/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/fastly/next-compute-js/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/fastly/next-compute-js/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/fastly/next-compute-js/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/fastly/next-compute-js/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/fastly/next-compute-js/releases/tag/v0.3.0
