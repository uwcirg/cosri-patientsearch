module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: "3.27",
        // Note: Babel now reads browserslist from package.json, the same list
        // eslint-plugin-compat uses
      },
    ],
    ["@babel/preset-react"],
  ],
  plugins: ["babel-plugin-react-compiler"],
};
