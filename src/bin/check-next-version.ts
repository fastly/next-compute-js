#!/usr/bin/env node
/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

const { checkNextVersion } = require('../init-server/check-next-version');
checkNextVersion();
