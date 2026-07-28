module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3,
        targets: {
          browsers: ["> 0.25%, not dead", "not op_mini all"],
        },
      },
    ],
    ["@babel/preset-react"],
  ],
  plugins: ["babel-plugin-react-compiler"],
};
