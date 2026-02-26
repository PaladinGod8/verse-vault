'use strict';
// Minimal script that uses Electron's built-in directly
// Electron 35 main process: access app via built-in
var app = process.electronBinding ? process.electronBinding('app') : null;
process.stdout.write('process.type: ' + process.type + '\n');
process.stdout.write(
  'process.versions.electron: ' +
    (process.versions && process.versions.electron) +
    '\n',
);
process.stdout.write(
  'typeof process.electronBinding: ' + typeof process.electronBinding + '\n',
);
setTimeout(function () {
  process.exit(0);
}, 1000);
