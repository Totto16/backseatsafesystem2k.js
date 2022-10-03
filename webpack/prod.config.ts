import path from "path"
import webpack from "webpack"
import "webpack-dev-server"

const config: webpack.Configuration = {
    mode: 'production',

    bail: true,

    devtool: 'source-map',

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
