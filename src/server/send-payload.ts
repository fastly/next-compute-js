import { Buffer } from 'buffer';
import crypto from 'crypto';
export function generateETag(payload: string) {
  if (payload.length === 0) {
    // fast-path empty
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';
  }

  // compute hash of entity
  const hash = crypto
    .createHash('sha1')
    .update(payload, 'utf8')
    .digest('base64')
    .substring(0, 27);

  // compute length of entity
  const len: number = Buffer.byteLength(payload);

  return '"' + len.toString(16) + '-' + hash + '"';
}
