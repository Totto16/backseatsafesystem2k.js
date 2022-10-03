import path from "path"
import webpack from "webpack"
import "webpack-dev-server"

const config: webpack.Configuration = {
    mode: "development",

    // fastest mode, for more see: https://webpack.js.org/configuration/devtool/
    devtool: "eval",

    entry: {
        index: "./src/index.ts",
    },

    output: {
        path: path.resolve(__dirname, "..", "public"),
        filename: (a) => {
            return "[name].js"
        },
        library: "[name]",
        libraryTarget: "umd",
        libraryExport: "default",
        umdNamedDefine: true,
        publicPath: "/",
    },

    resolve: {
        modules: ["node_modules"],
        extensions: [".js", ".ts"],
        preferRelative: true,
    },

    module: {
        strictExportPresence: true,
        rules: [
            {
                test: /(?<!\.d)\.ts$/,
                exclude: /node_modules|\.d\.ts$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            context: path.join(__dirname, ".."),
                            configFile: path.join(
                                __dirname,
                                "../tsconfig.json"
                            ),
                        },
                    },
                ],
            },
            {
                test: /\.d\.ts$/,
                loader: "ignore-loader",
            },
        ],
    },
    watchOptions: {
        ignored: /node_modules/,
    },
    devServer: {
        compress: true,
        static: [
            {
                directory: path.resolve(__dirname, "..", "public"),
            },
        ],
        open: true,
        historyApiFallback: {
            disableDotRule: true,
        },
        client: {
            logging: "none",
        },
        port: 9090,
    },

    node: {
        global: false,
        __filename: false,
        __dirname: false,
    },

    performance: {
        hints: false,
    },
    optimization: {
        mangleWasmImports: false,
    },
    experiments: {
        topLevelAwait: true,
    },
}

export default config
