const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  target: 'node',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      }
    ]
  },
  externals: {
    'aws-sdk': 'aws-sdk',
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
  ]
};
