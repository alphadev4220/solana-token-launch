const webpack = require("webpack");

module.exports = function override(config, env) {
    console.log("React app rewired works!")
    config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        buffer: require.resolve("buffer"),
    };
    config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];
    config.plugins = [
        ...config.plugins,
        new webpack.ProvidePlugin({
            process: "process/browser",
            Buffer: ["buffer", "Buffer"],
        }),
    ];
    return config;
};
