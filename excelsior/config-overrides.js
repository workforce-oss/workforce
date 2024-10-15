module.exports = function override(config) {
    const webpack = require("webpack");
    const fallback = config.resolve.fallback || {};
    config.stats = "verbose";
    Object.assign(fallback, {
        path: false,
        crypto: require.resolve("crypto-browserify"), // require.resolve("crypto-browserify") can be polyfilled here if needed
        stream: false, // require.resolve("stream-browserify") can be polyfilled here if needed
        assert: false, // require.resolve("assert") can be polyfilled here if needed
        http: false, // require.resolve("stream-http") can be polyfilled here if needed
        https: false, // require.resolve("https-browserify") can be polyfilled here if needed
        os: false, // require.resolve("os-browserify") can be polyfilled here if needed
        url: false, // require.resolve("url") can be polyfilled here if needed
        zlib: false, // require.resolve("browserify-zlib") can be polyfilled here if needed
        fs: false, // require.resolve("browserify-fs") can be polyfilled here if needed
        net: false, // require.resolve("net") can be polyfilled here if needed
        tls: false, // require.resolve("tls") can be polyfilled here if needed
    });
    const plugins = config.plugins || [];
    plugins.push(
        new webpack.IgnorePlugin({
            resourceRegExp: /express/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /mongodb/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /mysql/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /pg/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /redis/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /sqlite3/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /postgres/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /@slack/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /sequelize/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /async_hooks/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /db/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /broker/,
        }),
            
    );
    config.plugins = plugins;
    config.resolve.fallback = fallback;
    
    return config;
};
