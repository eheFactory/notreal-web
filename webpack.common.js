const path = require('path')

module.exports = {
    entry: './src/entry.js',
    module: {
        rules: [
            {
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', 'jsx', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './'),
    },
}