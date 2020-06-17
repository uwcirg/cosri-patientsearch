const webpack = require('webpack');
const path = require('path');
const TerserWebpackPlugin = require("terser-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const dotenv = require('dotenv');

module.exports = function(_env, argv) {
  const isProduction = argv.mode === "production";
  const isDevelopment = !isProduction;
  /*
   * output to static file for ease of development
   */
  const outputDirectory = isDevelopment?"/patientsearch/static":"/patientsearch/dist";
  const jsDirectory = `${outputDirectory}/js`;
  const templateDirectory = `${outputDirectory}/templates`;
  /*
   * output to static file for ease of development
   */
  const envConfig = dotenv.config();
  // call dotenv and it will return an Object with a parsed key 
  const env = envConfig ? envConfig.parsed : null;
  let envKeys = {};

  if (env) {
    // reduce it to a object
    try {
      envKeys = Object.keys(env).reduce((prev, next) => {
        prev[`process.env.${next}`] = JSON.stringify(env[next]);
        return prev;
      }, {});
    } catch(e) {
      console.log("Error occurred processing .env config ", e);
    }
  }
  
  return {
    entry:  ['whatwg-fetch', path.join(__dirname, '/patientsearch/src/js/Entry.js')],
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000
    },
    output: {
      path: path.join(__dirname, jsDirectory),
      /*
       * create a new hash for each new build
       */
      filename: `app.bundle.[name]${isProduction?'-[hash:6]':''}.js`,
      publicPath: "/static/js/"
    },
    resolve: {
        extensions: ['.js', '.jsx', '.css']
    },
    module: {
        rules: [
          //parse css files
          {
            test: /\.css$/,
            use:[ {
              loader: 'style-loader'
            }, {
              loader: 'css-loader',
              options: {
                "sourceMap": !isProduction
              }
            }]
          },
          {
            test: /\.(png|jpe?g|gif)$/i,
            loader: 'url-loader'
          },
          {
            test: /\.js?/,
            exclude: /node_modules/,
            use: 'babel-loader'
          },
          {
            test: /\.s[ac]ss$/i,
            use: [
              // Creates `style` nodes from JS strings
              'style-loader',
              // Translates CSS into CommonJS
              'css-loader',
              // Compiles Sass to CSS
              'sass-loader',
            ],
          },
        ]
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        title: "CORSI Patient Search",
        template: path.join(__dirname, '/patientsearch/src/index.html'),
        filename: path.join(__dirname, `${templateDirectory}/index.html`),
        favicon: path.join(__dirname, '/patientsearch/src/assets/favicon.ico'),
      }),
      new webpack.ProvidePlugin({ 
        React: 'react', 
        Promise: 'es6-promise'
      }), 
      new webpack.DefinePlugin({
        ...envKeys,
        "process.env.NODE_ENV": JSON.stringify(
          isProduction ? "production" : "development"
        )
      }),
      new FileManagerPlugin({
        onStart: {
          delete: [
            path.join(__dirname, '/patientsearch/dist')
          ]
        },
        onEnd: {
          copy: [
            {
              source:  path.join(__dirname, '/patientsearch/src/public'),
              destination: path.join(__dirname, '/patientsearch/dist/public')
            }
          ]
        }
      })
    ],
    devServer: {
      compress: true,
      historyApiFallback: true,
      open: true,
      overlay: true,
      contentBase: './dist',
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserWebpackPlugin({
          terserOptions: {
            compress: {
              comparisons: false
            },
            mangle: {
              safari10: true
            },
            output: {
              comments: false,
              ascii_only: true
            },
            sourceMap: !isProduction,
            warnings: false
          }
        }),
        new OptimizeCssAssetsPlugin({
          verbose: true
        }),
      ],
      splitChunks: {
        chunks: "all",
        minSize: 0,
        maxInitialRequests: 10,
        maxAsyncRequests: 10,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name(module, chunks, cacheGroupKey) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `${cacheGroupKey}.${packageName.replace("@", "")}`;
            }
          },
          common: {
            minChunks: 2,
            priority: -10
          }
        }
      }
    }
  };
}
