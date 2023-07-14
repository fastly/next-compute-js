/** @type {import('@fastly/serve-vercel-build-output').ServerConfig} */
const config = {
  // Specify backends here. These are used by any 'rewrites' that would proxy through the specified domain names.
  // If you wish to use dynamic backends, specify the string 'dynamic' instead of specifying an object here.
  backends: {
    // 'http-me': { url: 'https://http-me.glitch.me/' },
  },

  // To simulate Vercel's Edge Network Cache step, you will need a KV store in your Fastly account, and it must be
  // linked to your Fastly service. Specify the name of the resource link (not the name of the KV store itself) here.
  // For information about linked resources,
  // see: https://developer.fastly.com/learning/concepts/data-stores/#kv-stores
  // cachingKvStore: 'next-kvcache',
};

module.exports = config;
