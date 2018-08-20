const webpack = require('webpack');

const pwd = process.env.PWD;
const filename = 'ircjs';
const library = 'Irc';

module.exports = {
  mode: 'production',
  entry: './src/irc.js',
  devtool: 'cheap-module-source-map',
  optimization: {minimize: true},
  output: {
    path: pwd + '/dist',
    filename: filename + '.js',
    library: library,
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      }],
  },
  plugins: [new webpack.optimize.OccurrenceOrderPlugin()],
};