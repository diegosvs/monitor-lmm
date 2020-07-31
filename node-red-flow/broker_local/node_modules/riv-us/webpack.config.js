var common = require('./webpack.common.config');
var path = require('path');

module.exports = Object.assign({}, common, {
  entry: './src/rivus.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'rivus.bundle.js',
    libraryTarget: 'commonjs2'
  }
});
