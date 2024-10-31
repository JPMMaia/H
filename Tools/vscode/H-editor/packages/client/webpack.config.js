//@ts-check

'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
    context: path.join(__dirname),
    entry: path.join(__dirname, "../../out/packages/client/src/extension"),
    output: {
        filename: 'client.js',
        path: path.join(__dirname, '../../dist')
    }
});
