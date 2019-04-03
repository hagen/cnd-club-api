const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')
module.exports = {
  // entry: set by the plugin
  // output: set by the plugin
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
  },
  externals: [
    nodeExternals(),
  ],
  plugins: [
    new webpack.DefinePlugin({ 'global.GENTLY': false }),
    new webpack.IgnorePlugin(/(sqlite3|tedious|pg|pg-hstore|pg-native)/),
  ],
  resolve: { mainFields: [ 'main', 'module' ] },
  module: {
    rules: [
      // {
      //   test: /\.sql$/i,
      //   use: 'raw-loader',
      // },
      {
        test: /\.js$/,
        exclude: [
          /node_modules/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                'env',
                {
                  target: { node: '8.10' }, // Node version on AWS Lambda
                  useBuiltIns: true,
                  // modules: false,
                  loose: true,
                },
              ],
              'stage-0',
            ],
            plugins: [
              'syntax-object-rest-spread',
              'transform-runtime',
              'transform-object-rest-spread'
            ]
          }
        },
      }
    ]
  }
};
