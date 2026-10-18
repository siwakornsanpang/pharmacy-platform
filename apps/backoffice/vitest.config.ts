const { resolve } = require('node:path');

module.exports = {
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: { environment: 'node' },
};
