'use strict';
var type = process.type;
var versions = JSON.stringify(process.versions).substring(0, 200);
var electron = require('electron');
var electronType = typeof electron;
var electronStr = electronType === 'string'
  ? electron.substring(0, 80)
  : JSON.stringify(Object.keys(electron || {}).slice(0, 6));
var out = [
  'process.type: ' + type,
  'process.versions: ' + versions,
  "require('electron') type: " + electronType,
  "require('electron') value/keys: " + electronStr,
].join('\n');
process.stdout.write(out + '\n');
setTimeout(function() {
  process.exit(0);
}, 500);
