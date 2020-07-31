var common = require('./webpack.common.config');
var path = require('path');

module.exports = Object.assign({}, common, {
  entry: './test/all.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'test.bundle.js'
  }
});
