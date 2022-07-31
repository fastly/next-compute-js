/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

const defaultContentTypes = [
  // Text formats
  { test: /.txt$/, type: 'text/plain', binary: false },
  { test: /.htm(l)?$/, type: 'text/html', binary: false },
  { test: /.xml$/, type: 'application/xml', binary: false },
  { test: /.json$/, type: 'application/json', binary: false },
  { test: /.map$/, type: 'application/json', binary: false },
  { test: /.js$/, type: 'application/javascript', binary: false },
  { test: /.css$/, type: 'text/css', binary: false },
  { test: /.svg$/, type: 'image/svg+xml', binary: false },

  // Binary formats
  { test: /.bmp$/, type: 'image/bmp', binary: true },
  { test: /.png$/, type: 'image/png', binary: true },
  { test: /.gif$/, type: 'image/gif', binary: true },
  { test: /.jp(e)?g$/, type: 'image/jpeg', binary: true },
  { test: /.ico$/, type: 'image/vnd.microsoft.icon', binary: true },
  { test: /.tif(f)?$/, type: 'image/png', binary: true },
  { test: /.aac$/, type: 'audio/aac', binary: true },
  { test: /.mp3$/, type: 'audio/mpeg', binary: true },
  { test: /.avi$/, type: 'video/x-msvideo', binary: true },
  { test: /.mp4$/, type: 'video/mp4', binary: true },
  { test: /.mpeg$/, type: 'video/mpeg', binary: true },
  { test: /.webm$/, type: 'video/webm', binary: true },
  { test: /.pdf$/, type: 'application/pdf', binary: true },
  { test: /.tar$/, type: 'application/x-tar', binary: true },
  { test: /.zip$/, type: 'application/zip', binary: true },
  { test: /.eot$/, type: 'application/vnd.ms-fontobject', binary: true },
  { test: /.otf$/, type: 'font/otf', binary: true },
  { test: /.ttf$/, type: 'font/ttf', binary: true },
  { test: /.woff$/, type: 'font/woff', binary: true },
  { test: /.woff2$/, type: 'font/woff2', binary: true },
];

function mergeContentTypes(contentTypes) {

  const finalContentTypes = [];

  if(!Array.isArray(contentTypes)) {
    console.warn('contentTypes not an array, ignoring.');
  } else {

    for (const [index, contentType] of contentTypes.entries()) {
      let invalid = false;

      if(
        typeof contentType.test !== 'function' &&
        !(contentType.test instanceof RegExp)
      ) {
        console.warn(`Ignoring contentTypes[${index}]: 'test' must be a function or regular expression.`);
        invalid = true;
      }

      if(typeof contentType.type !== 'string' || contentType.type.indexOf('/') === -1) {
        console.warn(`Ignoring contentTypes[${index}]: 'type' must be a string representing a MIME type.`);
        invalid = true;
      }

      if('binary' in contentType && typeof contentType.binary !== 'boolean') {
        console.warn(`Ignoring contentTypes[${index}]: optional 'binary' must be a boolean value.`);
        invalid = true;
      }

      if(!invalid) {
        const contentTypeDef = {
          test: contentType.test,
          type: contentType.type,
        };
        if(contentType.binary != null) {
          contentTypeDef.binary = contentType.binary;
        }
        finalContentTypes.push(contentTypeDef);
      }
    }
  }

  console.log('Applying ' + finalContentTypes.length + ' custom content type(s).');

  for (const contentType of defaultContentTypes) {
    finalContentTypes.push(contentType);
  }

  return finalContentTypes;
}

function testFileContentType(contentTypes, file) {
  for (const contentType of contentTypes) {
    let matched = false;
    if(contentType.test instanceof RegExp) {
      matched = contentType.test.test(file);
    } else {
      // should be a function
      matched = contentType.test(file);
    }
    if(matched) {
      return { type: contentType.type, binary: Boolean(contentType.binary) };
    }
  }
  return null;
}

module.exports = {
  mergeContentTypes,
  testFileContentType,
};
