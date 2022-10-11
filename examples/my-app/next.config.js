module.exports = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/foo',
        headers: [
          {
            key: 'x-custom-header',
            value: 'my custom header value',
          },
        ],
      },
    ]
  },
};

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
