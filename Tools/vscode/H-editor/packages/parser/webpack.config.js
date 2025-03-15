//@ts-check

'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
    context: path.join(__dirname),
    entry: path.join(__dirname, "./src/Application.ts"),
    output: {
        filename: 'parser.js',
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
    resolve: {
        extensions: [".ts", ".js"]
    },
    devtool: 'source-map'
});
