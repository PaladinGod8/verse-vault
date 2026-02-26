'use strict';
// Check available Electron globals
var globals = Object.keys(global).filter(function (k) {
  return k.toLowerCase().includes('electron') || k === 'app';
});
var out = [
  'process.type: ' + process.type,
  'process.versions.electron: ' +
    (process.versions && process.versions.electron),
  'electron-related globals: ' + globals.join(', '),
  'typeof ipcMain: ' + typeof ipcMain,
  'typeof app: ' + typeof app,
];
process.stdout.write(out.join('\n') + '\n');
setTimeout(function () {
  process.exit(0);
}, 500);
