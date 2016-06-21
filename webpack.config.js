var path = require('path');

module.exports = {
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
          plugins: ['transform-react-jsx'],
        },
      },
    ],
  },
  entry: {
    bundle: './src/index',
  },
  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
  },
};

