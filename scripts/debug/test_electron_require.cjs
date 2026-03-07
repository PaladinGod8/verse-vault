'use strict';
var electron = require('electron');
var type = typeof electron;
var out = 'type: ' + type + '\n';
if (type === 'string') {
  out += 'IS STRING (path): ' + electron + '\n';
} else if (electron && type === 'object') {
  out += 'IS OBJECT keys: ' + Object.keys(electron).slice(0, 8).join(',') + '\n';
}
process.stdout.write(out);
setTimeout(function() {
  process.exit(0);
}, 500);
