const fs = require('node:fs');
const path = require('node:path');
const assets = path.resolve(__dirname, '../fixtures/assets');
const result = {};
for (const [family, file, suffix] of [
  ['Kanit', 'kanit.css', ':wght@300;400;500;600'],
  ['Geist', 'geist.css', ':wght@100..900'],
  ['Geist+Mono', 'geist_mono.css', ':wght@100..900'],
]) {
  result[`https://fonts.googleapis.com/css2?family=${family}${suffix}&display=swap`] = fs.readFileSync(path.join(assets, file), 'utf8').replaceAll('url("fonts/', `url(${assets}/fonts/`).replaceAll('.woff2")', '.woff2)');
}
module.exports = result;
