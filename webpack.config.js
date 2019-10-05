const path = require('path');

module.exports = {
  entry: {
    app: './index.js'
  },
  module: {
    rules: [
      {
        test: /\.rs$/,
        use: {
            loader: 'rust-native-wasm-loader',
            options: { wasmBindgen: { typescript: true } }
        }
      }
    ]
  },
  resolve: {
    extensions: [ '.js', '.rs' ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname)
  },


  /* BELOW IS DEVELOPMENT OPTIONS */
  mode: 'development',
  devtool: 'inline-source-maps'
};
