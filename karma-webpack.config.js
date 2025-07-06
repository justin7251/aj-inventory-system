module.exports = {
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@zxing/library': '@zxing/library/esm5/index.js',
      '@zxing/browser': '@zxing/browser/esm5/index.js'
    }
  }
};
