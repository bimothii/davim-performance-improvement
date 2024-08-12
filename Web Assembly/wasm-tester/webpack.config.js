// webpack.config.js or in your custom Webpack configuration
module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: "webassembly/async",
      },
    ],
  },
  resolve: {
    extensions: [".js", ".wasm"],
  },
  experiments: {
    asyncWebAssembly: true, // Enable WebAssembly support in Webpack 5+
  },
};
