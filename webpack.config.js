const path = require('path');

module.exports = {
  entry: './src/popup/index.jsx',
  output: {
    path: path.resolve(__dirname, 'popup'),
    filename: 'popup-bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  mode: 'development',
  devtool: 'cheap-module-source-map'
};

