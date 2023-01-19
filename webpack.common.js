const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
    entry: './src/entry.js',
    module: {
        rules: [
            {
                exclude: /node_modules/,
            },
            {
                test: /\.(glb|gltf)$/,
                include: path.resolve(__dirname, './src/assets'),
                use: [
                 {
                  loader: 'file-loader',
                  options: {
                   outputPath: 'assets/',
                   sourceMap: true
                  }
                }
            ]
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
    plugins: [
        new CopyWebpackPlugin({
         patterns: [{ from: './src/assets', to:'./assets' }]
        })
    ]
}