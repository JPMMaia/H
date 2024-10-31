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
    devtool: 'source-map'
});
