'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
spawnSync('node', [path.join(configDir, 'tools', 'stop-notify.js')], { stdio: 'inherit', timeout: 10000 });
