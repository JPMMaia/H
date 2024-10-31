//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

'use strict';

const path = require('path');
const merge = require('merge-options');

module.exports = function withDefaults(/**@type WebpackConfig*/extConfig) {

    /** @type WebpackConfig */
    let defaultConfig = {
        mode: 'none',
        target: 'node',
        node: {
            __dirname: false
        },
        resolve: {
            conditionNames: ['import', 'require', 'node'],
            mainFields: ['module', 'main'],
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [{
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            "sourceMap": true,
                        }
                    }
                }]
            }]
        },
        externals: {
            'vscode': 'commonjs vscode',
        },
        output: {
            libraryTarget: "commonjs",
        },
        devtool: 'source-map'
    };

    return merge(defaultConfig, extConfig);
};