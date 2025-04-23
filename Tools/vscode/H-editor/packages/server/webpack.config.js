//@ts-check

'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');
const webpack = require('webpack');

module.exports = withDefaults({
    context: path.join(__dirname),
    entry: path.join(__dirname, "../../out/packages/server/src/server.js"),
    output: {
        filename: 'server.js',
        path: path.join(__dirname, '../../dist')
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    externals: {
        'tree-sitter-hlang': 'commonjs tree-sitter-hlang',
        "tree-sitter": "commonjs tree-sitter"
    },
    devtool: 'source-map'
});
