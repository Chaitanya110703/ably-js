/**
 * Webpack v4 is used as Webpack v5 does not offer support for ES3 and creates issues for ES3 support such as discarding string literal keyword property names.
 */
const path = require('path');
const { BannerPlugin } = require('webpack');
const banner = require('./browser/fragments/license');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

const nodePath = path.resolve(__dirname, 'nodejs');
const browserPath = path.resolve(__dirname, 'browser');

const distPath = path.resolve(__dirname, 'dist');

const baseConfig = {
    mode: 'production',
    entry: {
        index: path.resolve(__dirname, 'common', 'lib', 'index.js'),
    },
    resolve: {
        extensions: ['.js', '.ts'],
    },
    output: {
        path: distPath,
        library: 'Ably',
        libraryTarget: 'umd',
        libraryExport: 'default',
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.ts$/, loader: "ts-loader" }
        ]
    },
    target: 'web',
    externals: {
        request: false,
        ws: false,
    },
    plugins: [new BannerPlugin({ banner })],
    performance: {
        hints: false,
    },
    stats: {
        modules: false,
    },
};

const nodeConfig = {
    ...baseConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-node.js',
    },
    resolve: {
        ...baseConfig.resolve,
        alias: {
            platform: path.resolve(nodePath, 'platform'),
            'platform-http': path.resolve(nodePath, 'lib', 'util', 'http'),
            'platform-bufferutils': path.resolve(nodePath, 'lib', 'util', 'bufferutils'),
            'platform-defaults': path.resolve(nodePath, 'lib', 'util', 'defaults'),
            'platform-crypto': path.resolve(nodePath, 'lib', 'util', 'crypto'),
            'platform-transports': path.resolve(nodePath, 'lib', 'transport'),
            // webpack null-loader is used to ensure that the following modules resolve to null - webpack won't compile unless these aliases are pointing at a valid module so these values are irrelevant.
            'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
            'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
            'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
        },
    },
    module: {
        rules: [
            ...baseConfig.module.rules,
            {
                test: /(platform-base64|platform-webstorage|platform-msgpack)/,
                use: 'null-loader',
            },
        ],
    },
    target: 'node',
    externals: {
        got: true,
        ws: true,
    },
    optimization: {
        minimize: false,
    },
};

const browserConfig = {
    ...baseConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably.js',
    },
    resolve: {
        ...baseConfig.resolve,
        alias: {
            platform: path.resolve(browserPath, 'fragments', 'platform-browser'),
            'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
            'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
            'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
            'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
            'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
            'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
            'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
            'platform-transports': path.resolve(browserPath, 'lib', 'transport'),
        },
    },
    node: {
        crypto: 'empty',
        Buffer: false,
    },
    externals: {
        'crypto-js': true,
    },
    optimization: {
        minimize: false,
    },
};

const nativeScriptConfig = {
    ...baseConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-nativescript.js',
    },
    resolve: {
        ...baseConfig.resolve,
        alias: {
            platform: path.resolve(browserPath, 'fragments', 'platform-nativescript'),
            'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
            'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
            'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
            'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
            'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
            'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
            'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
            'platform-transports': path.resolve(browserPath, 'lib', 'transport', 'withoutjsonp'),
        },
    },
    node: {
        crypto: 'empty',
        Buffer: false,
    },
    externals: {
        request: false,
        ws: false,
        'nativescript-websockets': true,
    },
    optimization: {
        minimize: false,
    },
    performance: {
        hints: false,
    },
};

const reactNativeConfig = {
    ...baseConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-reactnative.js',
    },
    resolve: {
        extensions: ['.js', '.ts'],
        alias: {
            platform: path.resolve(browserPath, 'fragments', 'platform-reactnative'),
            'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
            'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
            'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
            'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
            'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
            'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
            'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
            'platform-transports': path.resolve(browserPath, 'lib', 'transport', 'withoutjsonp'),
        },
    },
    node: {
        crypto: 'empty',
        Buffer: false,
    },
    externals: {
        request: false,
        ws: false,
        'react-native': true,
    },
    optimization: {
        minimize: false,
    },
    performance: {
        hints: false,
    },
};

const browserMinConfig = {
    ...browserConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably.min.js',
    },
    optimization: {
        minimize: true,
    },
    performance: {
        hints: 'warning',
    },
    devtool: 'source-map',
};

const webworkerConfig = {
    target: 'webworker',
    ...browserConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-webworker.min.js',
        globalObject: 'this',
    },
    optimization: {
        minimize: true,
    },
    performance: {
        hints: 'warning',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(browserPath, 'fragments', 'ably.d.ts'),
                    to: path.resolve(distPath, 'ably-webworker.min.d.ts'),
                }
            ],
        }),
    ],
};

const noEncryptionConfig = {
    ...browserConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably.noencryption.js',
    },
    module: {
        rules: [
            ...baseConfig.module.rules,
            {
                test: path.resolve(browserPath, 'lib', 'util', 'crypto'),
                use: 'null-loader',
            },
        ],
    },
};

const noEncryptionMinConfig = {
    ...browserMinConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably.noencryption.min.js',
    },
    module: {
        rules: [
            ...baseConfig.module.rules,
            {
                test: path.resolve(browserPath, 'lib', 'util', 'crypto'),
                use: 'null-loader',
            },
        ],
    },
    devtool: 'source-map',
};

// We are using UMD in ably.js now so there is no need to build separately for CommonJS. These files are still being distributed to avoid breaking changes but should no longer be used.
const commonJsConfig = {
    ...browserConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-commonjs.js',
    },
};

const commonJsNoEncryptionConfig = {
    ...noEncryptionConfig,
    output: {
        ...baseConfig.output,
        filename: 'ably-commonjs.noencryption.js',
    },
};

module.exports = {
    node: nodeConfig,
    browser: browserConfig,
    browserMin: browserMinConfig,
    webworker: webworkerConfig,
    nativeScript: nativeScriptConfig,
    reactNative: reactNativeConfig,
    noEncryption: noEncryptionConfig,
    noEncryptionMin: noEncryptionMinConfig,
    commonJs: commonJsConfig,
    commonJsNoEncryption: commonJsNoEncryptionConfig,
};
