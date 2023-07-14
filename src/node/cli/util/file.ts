/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import path from 'path';
import fs from 'fs';
import nunjucks from 'nunjucks';

export type CopyResourceFileOptions = {
  toFileName?: string,
  templateContext?: object,
};

export function copyResourceFile(filePath: string, src: string, target: string, opts?: CopyResourceFileOptions) {
  const srcFilePath = path.resolve(src, filePath);
  const targetFilePath = path.resolve(target, opts?.toFileName ?? filePath);
  if(opts?.templateContext != null) {
    console.log(`${srcFilePath} -> ${targetFilePath} (template)`);
    const srcFile = fs.readFileSync(srcFilePath, 'utf-8');
    const destFile = nunjucks.renderString(srcFile, opts.templateContext);
    fs.writeFileSync(targetFilePath, destFile, 'utf-8');
  } else {
    console.log(`${srcFilePath} -> ${targetFilePath}`);
    fs.copyFileSync(srcFilePath, targetFilePath);
  }
}
