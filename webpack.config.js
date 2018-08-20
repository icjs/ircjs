const webpack = require('webpack');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const env = process.env.NODE_ENV;
const pwd = process.env.PWD;
const filename = 'ircjs';
const library = 'Irc';

console.log(pwd);

const config = {
  mode: env,
  entry: './src/irc.js',
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
      },
      // {
      //   test: /\.json$/,
      //   loader: 'json-loader',
      // },
    ],
  },
  devtool: 'cheap-module-source-map',
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({'process.env.NODE_ENV': JSON.stringify(env)}),
  ],
};

if (env === 'production') {
  config.output.filename = filename + '.min.js';
}

module.exports = config;