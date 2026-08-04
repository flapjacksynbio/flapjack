/* eslint-disable no-undef */
const { override, addBabelPlugin } = require('customize-cra')

module.exports = {
  webpack: override(addBabelPlugin('babel-plugin-root-import')),

  // Jest does not go through the webpack override chain, so the `~/` prefix
  // that babel-plugin-root-import rewrites is unresolvable under test and every
  // suite failed at import before reaching an assertion.
  jest: (config) => {
    config.moduleNameMapper = {
      ...config.moduleNameMapper,
      '^~/(.*)$': '<rootDir>/$1',
    }
    // antd 6 and its @ant-design/rc-* dependencies publish untranspiled ESM.
    // Jest skips node_modules by default, so anything importing an antd icon
    // died on `Cannot use import statement outside a module`.
    config.transformIgnorePatterns = [
      '[/\\\\]node_modules[/\\\\](?!(antd|@ant-design|rc-[^/\\\\]+)[/\\\\]).+\\.(js|mjs|jsx|ts|tsx)$',
      '^.+\\.module\\.(css|sass|scss)$',
    ]
    return config
  },
}
