var path = require('path');
var nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  node: {
    __dirname: true,
    __filename: false
  },
  externals: [nodeExternals()],
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel',
      query: {
        presets: ['es2015'],
        plugins: [
          'add-module-exports',
          'transform-runtime',
          'syntax-async-functions',
          'transform-async-to-generator',
          'transform-object-rest-spread'
        ]
      }
    }]
  },
  devtool: 'source-map'
};
